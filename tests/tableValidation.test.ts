import { describe, expect, it } from 'vitest';
import { validateTableBatch } from '../src/tableValidation.js';

describe('validateTableBatch', () => {
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
