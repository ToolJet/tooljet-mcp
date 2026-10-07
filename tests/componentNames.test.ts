import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { addComponentTool } from '../src/tools/addComponent.js';
import { addComponentsTool } from '../src/tools/addComponents.js';
import { addComponentBatchesTool } from '../src/tools/addComponentBatches.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';

const context = { app_id: 'dispatch-app', version_id: 'version-2', page_id: 'dispatch-page' };
const container = (name: unknown) => ({
  name, type: 'Container', properties: {}, layout: { top: 0, left: 2, width: 39, height: 420 },
});
const existing = { id: 'panel-1', ...container('shipmentDetails') };

function mockClient(components: unknown[] = []) {
  return {
    getAppSummary: vi.fn().mockResolvedValue({
      app_id: context.app_id, version_id: context.version_id,
      pages: [{ id: context.page_id, components }], queries: [], events: [],
    }),
    createComponent: vi.fn().mockResolvedValue({ component_id: 'created-1' }),
    createComponents: vi.fn().mockResolvedValue([{ component_id: 'created-1' }]),
    updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
    updateLayouts: vi.fn(),
  };
}

function authoringInputs(client: ToolJetClient, name: unknown) {
  return [
    { tool: addComponentTool(client), args: { ...context, ...container(name) } },
    { tool: addComponentsTool(client), args: { ...context, components: [container(name)] } },
    { tool: addComponentBatchesTool(client), args: { ...context, pages: [
      { page_id: context.page_id, components: [container('dispatchSummary')] },
      { page_id: 'archive-page', components: [container(name)] },
    ] } },
    { tool: updateComponentsTool(client), args: { ...context, updates: [{ component_id: existing.id, name }] } },
    { tool: lintAppSpecTool(client), args: { pages: [{ name: 'Dispatch board', icon: 'IconHome', components: [container(name)] }] } },
  ];
}

describe('component names match App Builder', () => {
  it.each([
    '', ' ', 'Shipment drawer', 'drawer ', ' drawer', 'shipment\tdrawer', 'shipment\ndrawer',
    'drawer\n', 'drawer\r\n', 'drawer\f', 'drawer\u00a0', 'drawer\u200b', 'shipment.drawer',
    'shipment/drawer', 'drawer#1', 'drawer$1', 'café', 'drawer🚚', 'drawer\0',
  ])('rejects %j in every authoring schema', (name) => {
    for (const { tool, args } of authoringInputs({} as ToolJetClient, name)) {
      const parsed = z.object(tool.inputSchema).safeParse(args);
      expect(parsed.success, tool.name).toBe(false);
      if (!parsed.success) expect(parsed.error.issues.map(issue => issue.message).join(' ')).toMatch(/Component names.*letters.*hyphens/);
    }
  });

  it.each(['drawer', 'shipmentDetails', 'Shipment_2', 'shipment-detail', '9shipments', '9', '_', '-'])('accepts %j unchanged in every authoring schema', (name) => {
    for (const { tool, args } of authoringInputs({} as ToolJetClient, name)) {
      expect(z.object(tool.inputSchema).safeParse(args).success, tool.name).toBe(true);
    }
  });

  it.each([undefined, null, 123])('requires a string name on creation (%j)', (name) => {
    for (const { tool, args } of authoringInputs({} as ToolJetClient, name).filter(({ tool }) => tool.name !== 'update_components')) {
      expect(z.object(tool.inputSchema).safeParse(args).success, tool.name).toBe(false);
    }
  });

  it('keeps the name pattern in the model-facing JSON schema', () => {
    const schema = z.toJSONSchema(z.object(addComponentTool({} as ToolJetClient).inputSchema));
    expect(schema.properties?.name).toMatchObject({ pattern: '^[A-Za-z0-9_-]+$' });
  });

  it('refuses unsafe names before any write even when a handler is called directly', async () => {
    const mock = mockClient([existing]);
    for (const { tool, args } of authoringInputs(mock as unknown as ToolJetClient, 'Shipment drawer')) {
      const result = await tool.handler(args);
      expect(result.content[0]!.text, tool.name).toContain('Invalid component name');
      if (tool.name === 'lint_app_spec') {
        const body = JSON.parse(result.content[0]!.text);
        expect(body.ok).toBe(false);
        expect(body.plan_token).toBeUndefined();
      } else {
        expect(result.isError, tool.name).toBe(true);
      }
    }
    expect(mock.createComponent).not.toHaveBeenCalled();
    expect(mock.createComponents).not.toHaveBeenCalled();
    expect(mock.updateComponents).not.toHaveBeenCalled();
    expect(mock.updateLayouts).not.toHaveBeenCalled();
  });

  it('refuses a mixed create batch atomically, without silently sanitizing names', async () => {
    const mock = mockClient();
    const components = [container('dispatchSummary'), { ...container('Shipment drawer'), layout: { top: 460, left: 2, width: 39, height: 420 } }];
    const before = structuredClone(components);
    const result = await addComponentsTool(mock as unknown as ToolJetClient).handler({ ...context, components });
    expect(result.isError).toBe(true);
    expect(mock.createComponents).not.toHaveBeenCalled();
    expect(components).toEqual(before);
  });

  it('rejects the entire update batch when a later rename is invalid', async () => {
    const mock = mockClient([existing, { ...existing, id: 'panel-2', name: 'dispatchSummary' }]);
    const result = await updateComponentsTool(mock as unknown as ToolJetClient).handler({ ...context, updates: [
      { component_id: existing.id, definition: { properties: { visibility: true } } },
      { component_id: 'panel-2', name: 'Shipment drawer' },
    ] });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('Nothing was saved');
    expect(mock.updateComponents).not.toHaveBeenCalled();
    expect(mock.updateLayouts).not.toHaveBeenCalled();
  });

  it('allows definition repairs and safe renames of legacy components with invalid names', async () => {
    const mock = mockClient([{ ...existing, name: 'Shipment drawer' }]);
    const tool = updateComponentsTool(mock as unknown as ToolJetClient);
    for (const patch of [{ definition: { properties: { visibility: true } } }, { name: 'shipmentDetails' }]) {
      const result = await tool.handler({ ...context, updates: [{ component_id: existing.id, ...patch }] });
      expect(result.isError).not.toBe(true);
    }
    expect(mock.updateComponents).toHaveBeenCalledTimes(2);
    expect(mock.updateComponents).toHaveBeenLastCalledWith(expect.objectContaining({
      updates: [expect.objectContaining({ componentId: existing.id, name: 'shipmentDetails' })],
    }));
  });

  it('persists the safe single-token drawer name and leaves readable text alone', async () => {
    const mock = mockClient();
    const result = await addComponentsTool(mock as unknown as ToolJetClient).handler({ ...context, components: [
      { ...container('drawer'), client_ref: 'panel' },
      { name: 'shipmentTitle', type: 'Text', parent_ref: 'panel', properties: { text: 'Shipment activity' },
        layout: { top: 16, left: 2, width: 39, height: 40 } },
    ] });
    expect(result.isError).not.toBe(true);
    expect(mock.createComponents).toHaveBeenCalledWith(expect.objectContaining({ components: [
      expect.objectContaining({ name: 'drawer' }),
      expect.objectContaining({ name: 'shipmentTitle', properties: expect.objectContaining({ text: { value: 'Shipment activity' } }) }),
    ] }));
  });
});
