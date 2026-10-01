import { describe, expect, it } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';

const body = (result: any) => JSON.parse(result.content[0].text);
const read = async (type: string) => body(await getComponentCatalogTool({} as ToolJetClient).handler({ type, sections: ['overview'] }));

// Seven builds asked for "Dropdown" (the catalog has DropdownV2), were told only that the type is unknown, listed
// the whole catalog and asked again: three calls for one read.
describe('a catalog type that is nearly right', () => {
  it('answers with the current widget when the name lacks its version suffix or differs in case', async () => {
    expect((await read('Dropdown')).type).toBe('DropdownV2');
    expect((await read('dropdownv2')).type).toBe('DropdownV2');
    expect((await read('Dropdown')).requested_type ?? (await read('Dropdown')).alias?.requested_type).toBe('Dropdown');
  });

  it('names the closest types when nothing matches', async () => {
    const result = await read('DatePick');
    expect(result.error).toMatch(/Unknown component type "DatePick"/);
    expect(result.did_you_mean.length).toBeGreaterThan(0);
    expect(result.did_you_mean.some((type: string) => /^Date/.test(type))).toBe(true);
  });
});
