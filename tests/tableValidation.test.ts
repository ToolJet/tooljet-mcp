import { describe, expect, it, vi } from 'vitest';
import { validateTableBatch } from '../src/tableValidation.js';
import { createTablesTool } from '../src/tools/createTables.js';
import type { CreateTableParams, ToolJetClient } from '../src/tooljetClient.js';

function linkedTables(localType: string, remoteType?: string): CreateTableParams[] {
  return [{tableName:'equipment',columns: remoteType ? [{name:'id',type:remoteType,primaryKey:true}] : [{name:'label',type:'string'}]},
    {tableName:'service_log',columns:[{name:'equipment_id',type:localType}],foreignKeys:[{columns:['equipment_id'],referencedTable:'equipment',referencedColumns:['id']}]}];
}

describe('validateTableBatch', () => {
  it.each(['number','float','decimal',' DOUBLE PRECISION '])('rejects floating foreign keys to serial IDs before writes: %s', async type => {
    const tables=linkedTables(type,'serial'); const before=JSON.stringify(tables);
    expect(validateTableBatch(tables).join(' ')).toContain('number is not an integer ID');
    const client={listTables:vi.fn(),createTables:vi.fn()};
    const result=await createTablesTool(client as unknown as ToolJetClient).handler({tables:tables.map(t=>({table_name:t.tableName,columns:t.columns,foreign_keys:t.foreignKeys}))});
    expect(result.isError).toBe(true);
    expect(client.listTables).not.toHaveBeenCalled();
    expect(client.createTables).not.toHaveBeenCalled();
    expect(JSON.stringify(tables)).toBe(before);
  });
  it('handles implicit IDs and allows supported integer aliases without inferring external schemas', () => {
    expect(validateTableBatch(linkedTables('number')).join(' ')).toContain('equipment.id');
    for (const type of ['integer','INT','bigint']) expect(validateTableBatch(linkedTables(type,'serial'))).toEqual([]);
    expect(validateTableBatch(linkedTables('number','number'))).toEqual([]);
    expect(validateTableBatch(linkedTables('number').slice(1))).toEqual([]);
  });
  it('rejects the column names ToolJet DB treats as reserved, case-insensitively, with a rename', () => {
    const errors = validateTableBatch([{
      tableName: 'agendamentos',
      columns: [
        { name: 'id', type: 'serial', primaryKey: true },
        { name: 'data', type: 'timestamp' },
        { name: 'Date', type: 'string' },
        { name: 'nome_cliente', type: 'string' },
      ],
    }]);
    expect(errors.join(' ')).toMatch(/reserved column name "data".*payload or details/);
    expect(errors.join(' ')).toMatch(/reserved column name "Date".*event_date/);
    expect(errors.join(' ')).not.toMatch(/nome_cliente/);
  });

  it('rejects column types ToolJet DB does not accept and allows every alias the client normalises', () => {
    const errors = validateTableBatch([{
      tableName: 'crews',
      columns: [
        { name: 'id', type: 'serial', primaryKey: true },
        { name: 'hours', type: 'numeric(6,2)' },
        { name: 'shift_start', type: 'time' },
        { name: 'fee', type: 'decimal' },
        { name: 'active', type: 'bool' },
        { name: 'meta', type: 'json' },
        { name: 'seen_at', type: 'datetime' },
      ],
    }]);
    expect(errors.join(' ')).toMatch(/"hours" has type "numeric\(6,2\)", which ToolJet DB does not accept/);
    expect(errors.join(' ')).toMatch(/"shift_start" has type "time"/);
    expect(errors.join(' ')).not.toMatch(/fee|active|meta|seen_at/);
  });
});
