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

  it('refuses a Flux body that writes points back with to()', () => {
    /* query_data is a read by operation name only; Flux to() writes into a bucket. */
    const a = flux('from(bucket:"a") |> range(start:-1h) |> to(bucket:"b")');
    expect(a.provenRead).toBe(false);
    expect(a.reason).toMatch(/to\(\)/);
    expect(flux('from(bucket:"a") |> range(start:-1h) |> experimental.to(bucket:"b")').provenRead).toBe(false);
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
