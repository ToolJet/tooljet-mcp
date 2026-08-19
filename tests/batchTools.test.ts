import { describe, expect, it, vi } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { createTablesTool } from '../src/tools/createTables.js';
import { insertRowsBatchTool } from '../src/tools/insertRowsBatch.js';
import { addPagesTool } from '../src/tools/addPages.js';
import { updatePagesTool } from '../src/tools/updatePages.js';
import { tableCreationLevels, validateTableBatch } from '../src/tableValidation.js';

function textOf(result: { content: Array<{ text: string }> }): any {
  return JSON.parse(result.content[0]!.text);
}

describe('table batch validation', () => {
  it('orders foreign-key children after their parents', () => {
    const parent = { tableName: 'projects', columns: [{ name: 'id', type: 'serial', primaryKey: true }] };
    const child = {
      tableName: 'cases',
      columns: [{ name: 'project_id', type: 'integer' }],
      foreignKeys: [{ columns: ['project_id'], referencedTable: 'projects', referencedColumns: ['id'] }],
    };
    expect(tableCreationLevels([child, parent]).map((level) => level.map((table) => table.tableName))).toEqual([
      ['projects'],
      ['cases'],
    ]);
  });

  it('rejects all known mechanical failures before writes', () => {
    const errors = validateTableBatch([
      { tableName: 'tickets', columns: [{ name: 'action', type: 'string' }, { name: 'ACTION', type: 'string' }] },
      { tableName: 'Tickets', columns: [{ name: 'id', type: 'integer' }] },
    ]);
    expect(errors.join(' ')).toMatch(/duplicate table name/i);
    expect(errors.join(' ')).toMatch(/duplicate column name/i);
    expect(errors.join(' ')).toMatch(/reserved column name/i);
  });
});

describe('batch authoring tools', () => {
  it('creates a dependency-validated table batch through one client call', async () => {
    const client = {
      createTables: vi.fn().mockResolvedValue([
        { table_id: 'p1', table_name: 'projects' },
        { table_id: 'c1', table_name: 'cases' },
      ]),
    } as unknown as ToolJetClient;
    const result = await createTablesTool(client).handler({
      tables: [
        { table_name: 'projects', columns: [{ name: 'id', type: 'serial', primaryKey: true }] },
        {
          table_name: 'cases',
          columns: [{ name: 'project_id', type: 'integer' }],
          foreign_keys: [{ columns: ['project_id'], referencedTable: 'projects', referencedColumns: ['id'] }],
        },
      ],
    });
    expect(client.createTables).toHaveBeenCalledOnce();
    expect(textOf(result).tables).toHaveLength(2);
  });

  it('does not call the client when table preflight fails', async () => {
    const client = { createTables: vi.fn() } as unknown as ToolJetClient;
    const result = await createTablesTool(client).handler({
      tables: [{ table_name: 'steps', columns: [{ name: 'action', type: 'string' }] }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/reserved column name/i);
    expect(client.createTables).not.toHaveBeenCalled();
  });

  it('seeds several tables and returns a total row count', async () => {
    const client = {
      insertRowsBatch: vi.fn().mockResolvedValue([
        { table_name: 'projects', processed_rows: 1 },
        { table_name: 'cases', processed_rows: 3 },
      ]),
    } as unknown as ToolJetClient;
    const result = await insertRowsBatchTool(client).handler({
      tables: [
        { table_name: 'projects', rows: [{ id: 1, name: 'Web' }] },
        { table_name: 'cases', rows: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      ],
    });
    expect(textOf(result)).toMatchObject({ processed_rows: 4 });
  });

  it('adds pages as one verified batch', async () => {
    const client = {
      createPages: vi.fn().mockResolvedValue([
        { page_id: 'p2', name: 'Cases', index: 2, icon: 'IconChecklist' },
        { page_id: 'p3', name: 'Case Detail', index: 3, icon: 'IconFileDescription', hidden: true },
      ]),
    } as unknown as ToolJetClient;
    const result = await addPagesTool(client).handler({
      app_id: 'app1',
      version_id: 'v1',
      pages: [
        { name: 'Cases', icon: 'IconChecklist' },
        { name: 'Case Detail', icon: 'IconFileDescription', hidden: true },
      ],
    });
    expect(client.createPages).toHaveBeenCalledWith({
      appId: 'app1',
      versionId: 'v1',
      pages: [
        { name: 'Cases', icon: 'IconChecklist' },
        { name: 'Case Detail', icon: 'IconFileDescription', hidden: true },
      ],
    });
    expect(textOf(result).pages).toHaveLength(2);
  });

  it('updates page metadata and forwards a complete order', async () => {
    const client = {
      updatePages: vi.fn().mockResolvedValue({
        updated_fields: 1,
        reordered: true,
        pages: [
          { page_id: 'p2', name: 'Cases', icon: 'IconChecklist', hidden: false, index: 0 },
          { page_id: 'p1', name: 'Overview', icon: 'IconHome', hidden: false, index: 1 },
        ],
      }),
    } as unknown as ToolJetClient;
    const result = await updatePagesTool(client).handler({
      app_id: 'app1',
      version_id: 'v1',
      updates: [{ page_id: 'p1', name: 'Overview', icon: 'IconHome' }],
      order: ['p2', 'p1'],
    });

    expect(client.updatePages).toHaveBeenCalledWith({
      appId: 'app1',
      versionId: 'v1',
      updates: [{ pageId: 'p1', name: 'Overview', icon: 'IconHome', hidden: undefined }],
      order: ['p2', 'p1'],
    });
    expect(textOf(result)).toMatchObject({ updated_fields: 1, reordered: true });
  });
});
