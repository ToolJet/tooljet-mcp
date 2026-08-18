import { describe, it, expect, vi } from 'vitest';
import { generateFormSchema } from '../src/formSchema.js';
import { generateFormSchemaTool } from '../src/tools/generateFormSchema.js';
import type { SchemaColumn, ToolJetClient } from '../src/tooljetClient.js';

const columns: SchemaColumn[] = [
  { name: 'id', type: 'serial', isPrimaryKey: true, isNotNull: true, isUnique: true, foreignKeys: [] },
  { name: 'external_id', type: 'character varying', isPrimaryKey: true, isNotNull: true, isUnique: true, foreignKeys: [] },
  { name: 'customer_name', type: 'character varying', isPrimaryKey: false, isNotNull: true, isUnique: false, foreignKeys: [] },
  { name: 'amount', type: 'double precision', isPrimaryKey: false, isNotNull: true, isUnique: false, defaultValue: 0, foreignKeys: [] },
  { name: 'active', type: 'boolean', isPrimaryKey: false, isNotNull: false, isUnique: false, defaultValue: false, foreignKeys: [] },
  { name: 'created_at', type: 'timestamp with time zone', isPrimaryKey: false, isNotNull: false, isUnique: false, foreignKeys: [] },
  { name: 'metadata', type: 'jsonb', isPrimaryKey: false, isNotNull: false, isUnique: false, foreignKeys: [] },
];

describe('generateFormSchema', () => {
  it('maps ToolJet DB columns to a create Form and omits generated keys', () => {
    const result = generateFormSchema(columns, { tableName: 'orders', mode: 'create' });
    expect(result.properties.generateFormFrom).toEqual({ value: 'jsonSchema' });
    expect(result.schema.properties).not.toHaveProperty('id');
    expect(result.schema.properties).toHaveProperty('external_id');
    expect(result.schema.properties).toMatchObject({
      customer_name: { type: 'textinput', label: 'Customer Name' },
      amount: { type: 'number', value: '{{0}}' },
      active: { type: 'checkbox', value: '{{false}}' },
      created_at: { type: 'datepicker', enableDate: true, enableTime: true },
      metadata: { type: 'textarea' },
    });
    expect(result.properties.resetOnSubmit).toEqual({ value: '{{false}}' });
  });

  it('generates edit bindings without nested MCP components', () => {
    const result = generateFormSchema(columns, {
      tableName: 'orders', mode: 'edit', initialValuesBinding: 'components.ordersTable.selectedRow', exclude: ['metadata'],
    });
    expect(result.schema.properties.id).toMatchObject({
      value: '{{components.ordersTable.selectedRow["id"]}}',
      styles: { disabled: true },
    });
    expect(result.schema.properties).not.toHaveProperty('metadata');
    expect(result.properties.resetOnSubmit).toEqual({ value: '{{false}}' });
  });

  it('tool reads the real table schema and returns the generated properties', async () => {
    const client = { getTableSchema: vi.fn().mockResolvedValue(columns) } as unknown as ToolJetClient;
    const tool = generateFormSchemaTool(client);
    const response = await tool.handler({ table_name: 'orders', mode: 'create' });
    expect(client.getTableSchema).toHaveBeenCalledWith('orders');
    const body = JSON.parse(response.content[0]!.text);
    expect(body.schema.properties.customer_name.type).toBe('textinput');
  });
});
