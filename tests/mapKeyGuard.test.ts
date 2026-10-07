import { describe, expect, it } from 'vitest';
import { mapKeyRefusal } from '../src/mapKeyGuard.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

// cmp-map (2026-09-26): a delivery tracker got a Map on an instance with no Google Maps key; it rendered
// "ApiProjectMapError" in the viewer. The model cannot see the key, so the tool that writes the Map checks it.
const client = (key: boolean | undefined) => ({ hasGoogleMapsKey: async () => key } as unknown as ToolJetClient);

describe('a Map on an instance without a Google Maps key', () => {
  it('is refused with the fallback to use', async () => {
    const msg = await mapKeyRefusal(client(false), ['Table', 'Map']);
    expect(msg).toMatch(/GOOGLE_MAPS_API_KEY[\s\S]*Table[\s\S]*tell the user/i);
  });
  it('is allowed when the key is set, when no Map is planned, or when the key cannot be read', async () => {
    expect(await mapKeyRefusal(client(true), ['Map'])).toBeUndefined();
    expect(await mapKeyRefusal(client(false), ['Table'])).toBeUndefined();
    expect(await mapKeyRefusal(client(undefined), ['Map'])).toBeUndefined();
    expect(await mapKeyRefusal({} as ToolJetClient, ['Map'])).toBeUndefined();
  });
});

// Two warehouse builds (2026-10-05) read the Map catalog, wrote a Map page, and only learnt from the write's refusal
// that the instance has no key: a whole page rewritten each time. The catalog entry says so when Map is read.
describe('the Map catalog entry on an instance without a key', () => {
  it('carries the instance note', async () => {
    const { getComponentCatalogTool } = await import('../src/tools/getComponentCatalog.js');
    const tool = getComponentCatalogTool(client(false));
    const one = JSON.stringify(await tool.handler({ type: 'Map' } as never));
    expect(one).toMatch(/instance_note[\s\S]*GOOGLE_MAPS_API_KEY/);
    const batch = JSON.stringify(await tool.handler({ types: ['Table', 'Map'] } as never));
    expect(batch).toMatch(/instance_note/);
    const keyed = JSON.stringify(await getComponentCatalogTool(client(true)).handler({ type: 'Map' } as never));
    expect(keyed).not.toMatch(/instance_note/);
  });
});
