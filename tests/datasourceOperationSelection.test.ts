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
      else expect(['remote-spec', 'single'], source.kind).toContain(selection!.mode);
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
