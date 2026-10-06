import type { ToolJetClient } from './tooljetClient.js';

/**
 * ToolJet's Map loads Google Maps with the instance's GOOGLE_MAPS_API_KEY (public config). Without it the component
 * renders a Google error (cmp-map, 2026-09-26), and a model building the app cannot see the key. Returns the refusal
 * for a write that adds a Map when the instance is known to have no key; undefined otherwise (key set, no Map, or unknown).
 */
export async function mapKeyRefusal(client: ToolJetClient, componentTypes: Iterable<string>): Promise<string | undefined> {
  if (![...componentTypes].includes('Map') || typeof client.hasGoogleMapsKey !== 'function') return undefined;
  let hasKey: boolean | undefined;
  try { hasKey = await client.hasGoogleMapsKey(); } catch { return undefined; }
  if (hasKey !== false) return undefined;
  return 'This ToolJet instance has no Google Maps API key (GOOGLE_MAPS_API_KEY), so a Map component shows a Google error ' +
    'instead of a map. Show the locations in a Table (a link column to https://www.google.com/maps?q=<lat>,<lng> opens each ' +
    'one), and tell the user in your reply that an in-app map needs the Google Maps API key on the instance.';
}
