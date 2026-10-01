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
