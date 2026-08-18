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
    const result = generateFormSchema(columns, { tableName: 'orders', mode: 'create', exclude: ['metadata'] });
    expect(result.properties.generateFormFrom).toEqual({ value: 'jsonSchema' });
    expect(result.schema.properties).not.toHaveProperty('id');
    expect(result.schema.properties).toHaveProperty('external_id');
    expect(result.schema.properties).toMatchObject({
      customer_name: { type: 'textinput', label: 'Customer Name' },
      amount: { type: 'number', value: '{{0}}' },
      active: { type: 'checkbox', value: '{{false}}' },
      created_at: { type: 'datepicker', enableDate: true, enableTime: true, value: '{{null}}' },
    });
    expect(result.schema.properties).not.toHaveProperty('metadata');
    expect(result.properties.resetOnSubmit).toEqual({ value: '{{false}}' });
    expect(result.layout_guidance).toMatchObject({
      field_count: 5,
      recommended_canvas_height_px: 350,
      recommended_form_height_px: 480,
      recommended_modal_height_px: 560,
    });
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
    expect(result.layout_guidance.field_count).toBe(6);
  });

  it('normalizes string boolean defaults so "false" does not become truthy', () => {
    const result = generateFormSchema([
      { name: 'anonymous', type: 'boolean', isPrimaryKey: false, isNotNull: true, isUnique: false, defaultValue: 'false', foreignKeys: [] },
      { name: 'published', type: 'boolean', isPrimaryKey: false, isNotNull: true, isUnique: false, defaultValue: "'true'::boolean", foreignKeys: [] },
    ], { tableName: 'reports', mode: 'create' });

    expect(result.schema.properties.anonymous.value).toBe('{{false}}');
    expect(result.schema.properties.published.value).toBe('{{true}}');
  });

  it('preserves include order and supports explicit field overrides', () => {
    const result = generateFormSchema(columns, {
      tableName: 'orders',
      mode: 'create',
      include: ['created_at', 'customer_name', 'amount'],
      fieldOverrides: {
        customer_name: { label: 'Customer', placeholder: 'Enter customer name' },
      },
    });

    expect(Object.keys(result.schema.properties)).toEqual(['created_at', 'customer_name', 'amount']);
    expect(result.schema.properties.customer_name).toMatchObject({
      type: 'textinput', label: 'Customer', placeholder: 'Enter customer name',
    });
    expect(result.field_metadata[1]).toMatchObject({ name: 'customer_name', generated_type: 'textinput', overridden: true });
  });

  it('keeps safe email inference but rejects fields that require standalone layout', () => {
    const inferredColumns: SchemaColumn[] = [
      { name: 'description', type: 'character varying', isPrimaryKey: false, isNotNull: false, isUnique: false, foreignKeys: [] },
      { name: 'owner_email', type: 'character varying', isPrimaryKey: false, isNotNull: false, isUnique: false, foreignKeys: [] },
      { name: 'status', type: 'character varying', isPrimaryKey: false, isNotNull: false, isUnique: false, configurations: { allowedValues: ['Open', 'Closed'] }, foreignKeys: [] },
    ];
    const result = generateFormSchema(inferredColumns, {
      tableName: 'requests', mode: 'create', include: ['owner_email'],
    });

    expect(result.schema.properties.owner_email.type).toBe('emailinput');
    expect(() => generateFormSchema(inferredColumns, {
      tableName: 'requests', mode: 'create', include: ['description', 'status'],
    })).toThrow(/not layout-safe.*description \(textarea\).*status \(dropdown\).*standalone components.*alignment.*top/is);
  });

  it('rejects unsafe filepicker fields and invalid Form dropdown options', () => {
    expect(() => generateFormSchema(columns, {
      tableName: 'orders', mode: 'create', include: ['customer_name'],
      fieldOverrides: { customer_name: { type: 'filepicker' } },
    })).toThrow(/filepicker.*crashes the entire Form.*standalone FilePicker/is);

    expect(() => generateFormSchema(columns, {
      tableName: 'orders', mode: 'create', include: ['customer_name'],
      fieldOverrides: { customer_name: { type: 'dropdown', options: ['A'] } },
    })).toThrow(/uses "options".*values.*displayValues/is);
  });

  it('tool reads the real table schema and returns the generated properties', async () => {
    const client = { getTableSchema: vi.fn().mockResolvedValue(columns) } as unknown as ToolJetClient;
    const tool = generateFormSchemaTool(client);
    const response = await tool.handler({
      table_name: 'orders', mode: 'create',
      include: ['customer_name'],
      field_overrides: { customer_name: { label: 'Customer' } },
    });
    expect(client.getTableSchema).toHaveBeenCalledWith('orders');
    const body = JSON.parse(response.content[0]!.text);
    expect(body.schema.properties.customer_name).toMatchObject({ type: 'textinput', label: 'Customer' });
  });

  it('tool returns an actionable failure instead of generating a broken mixed-type Form', async () => {
    const client = { getTableSchema: vi.fn().mockResolvedValue(columns) } as unknown as ToolJetClient;
    const response = await generateFormSchemaTool(client).handler({
      table_name: 'orders', mode: 'create', include: ['metadata'],
    });

    expect(response.isError).toBe(true);
    expect(response.content[0]!.text).toMatch(/metadata \(textarea\).*entire form.*standalone components.*two-column.*full-width/is);
  });
});
