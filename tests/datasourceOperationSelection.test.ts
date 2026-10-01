import { describe, it, expect } from 'vitest';
import { getDatasourceCatalog, getDatasourceQuerySchema } from '../src/datasourceCatalog.js';
import { validateQueryOptions } from '../src/queryValidation.js';

describe('datasource operation selection', () => {
  it('names operations that select on a plugin-native key rather than operation/mode', () => {
    // sharepoint (sp_operation), weaviate (data_type + operation_<type>) and n8n (method) used to
    // compile into one anonymous `default` contract and report zero operations.
    expect(getDatasourceQuerySchema('sharepoint')!.operations).toEqual(expect.arrayContaining([
      'get_sites', 'get_site', 'get_lists', 'get_items', 'create_list', 'update_item', 'delete_item',
    ]));
    expect(getDatasourceQuerySchema('weaviate')!.operations).toEqual(expect.arrayContaining([
      'schema.get_schema', 'collection.get_collection', 'objects.list_objects',
    ]));
    expect(getDatasourceQuerySchema('n8n')!.operations).toEqual(expect.arrayContaining(['get', 'post']));
  });

  it('splits each named operation into its own contract instead of one merged variant list', () => {
    const sharepoint = getDatasourceQuerySchema('sharepoint')!;
    expect(sharepoint.contracts).not.toHaveProperty('default');
    expect(Object.keys(sharepoint.contracts['get_site']!.variants[0]!.fields)).toEqual(
      expect.arrayContaining(['sp_operation', 'sp_site_id'])
    );
    // get_sites takes paging, not a site id; the merged contract could not express that.
    expect(sharepoint.contracts['get_sites']!.variants[0]!.fields).not.toHaveProperty('sp_site_id');
  });

  it('explains every kind that still has no named operations', () => {
    for (const source of getDatasourceCatalog()) {
      const schema = getDatasourceQuerySchema(source.kind)!;
      const selection = schema.operationSelection;
      expect(selection, source.kind).toBeDefined();
      if (schema.operations.length) expect(selection!.mode, source.kind).toBe('enumerated');
      else expect(['remote-spec', 'single', 'user-supplied-schema'], source.kind).toContain(selection!.mode);
    }
  });

  it('points a spec-driven kind at its spec rather than an empty operation list', () => {
    const stripe = getDatasourceQuerySchema('stripe')!;
    expect(stripe.operationSelection).toMatchObject({ mode: 'remote-spec', field: 'stripe_operation' });
    expect(stripe.operationSelection!.specUrl).toMatch(/^https:/);
  });

  it('resolves a plugin-native operation through its own selector during validation', () => {
    const result = validateQueryOptions('sharepoint', { sp_operation: 'get_site', sp_site_id: 'root' });
    expect(result.operation).toBe('get_site');
    expect(result.errors).toEqual([]);
  });

  it('never reports an empty list of valid operations', () => {
    const result = validateQueryOptions('sharepoint', {});
    const message = result.errors.map((error) => error.message).join(' ');
    expect(message).not.toMatch(/Valid operations: \./);
    expect(message).toMatch(/sp_operation/);
  });
});

describe('spec-driven datasource spec references', () => {
  const specDriven = () => getDatasourceCatalog()
    .map((source) => getDatasourceQuerySchema(source.kind)!)
    .filter((schema) => schema.operationSelection?.mode === 'remote-spec');

  it('records a spec reference for every spec-driven kind', () => {
    // ToolJet spells the pointer `spec_url` on older plugins and `specUrl` on newer ones, and its
    // value is a single reference or a {label: reference} map; reading only string `spec_url` left
    // 10 of the 14 kinds claiming a spec drives them without saying which spec.
    for (const schema of specDriven()) {
      expect(schema.operationSelection!.specs, schema.kind).toBeDefined();
      expect(schema.operationSelection!.specs!.length, schema.kind).toBeGreaterThan(0);
    }
  });

  it('resolves multi-spec kinds declared under either key spelling', () => {
    // fedex/ups use snake_case + a dict; hubspot/xero use camelCase + a dict.
    const counts = Object.fromEntries(
      ['fedex', 'ups', 'hubspot', 'xero', 'microsoft_graph', 'aftership'].map((kind) =>
        [kind, getDatasourceQuerySchema(kind)!.operationSelection!.specs!.length]
      )
    );
    expect(counts).toEqual({ fedex: 13, ups: 7, hubspot: 35, xero: 11, microsoft_graph: 7, aftership: 3 });
    expect(getDatasourceQuerySchema('hubspot')!.operationSelection!.specs![0]!.label).toBeTruthy();
  });

  it('separates specs bundled in the ToolJet repo from ones fetched from the vendor', () => {
    const bundled = specDriven().filter((schema) =>
      schema.operationSelection!.specs!.every((spec) => spec.location === 'bundled'));
    expect(bundled).toHaveLength(13);

    const stripe = getDatasourceQuerySchema('stripe')!.operationSelection!;
    expect(stripe.specs).toEqual([expect.objectContaining({ location: 'remote' })]);
    expect(stripe.specUrl).toMatch(/^https:/);
  });

  it('gives every bundled spec a resolved repo path', () => {
    for (const schema of specDriven()) {
      for (const spec of schema.operationSelection!.specs!) {
        if (spec.location !== 'bundled') continue;
        expect(spec.unresolved, `${schema.kind} ${spec.ref}`).toBeUndefined();
        expect(spec.path, `${schema.kind} ${spec.ref}`)
          .toMatch(/^marketplace\/plugins\/[^/]+\/openapi-specs\/.+\.(json|ya?ml)$/);
      }
    }
  });

  it('does not describe a bundled spec as remote', () => {
    expect(getDatasourceQuerySchema('hubspot')!.operationSelection!.description)
      .not.toMatch(/remote API spec/);
    expect(getDatasourceQuerySchema('stripe')!.operationSelection!.description)
      .toMatch(/remote API spec/);
  });
});

describe('user-supplied schema kinds', () => {
  it('separates a caller-supplied .proto from a single query form', () => {
    for (const kind of ['grpc', 'grpcv2']) {
      expect(getDatasourceQuerySchema(kind)!.operationSelection!.mode, kind).toBe('user-supplied-schema');
    }
    expect(getDatasourceQuerySchema('redis')!.operationSelection!.mode).toBe('single');
  });
});
