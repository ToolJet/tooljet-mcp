import type { ComponentLibrary } from './componentLibrary.js';
import type { ToolJetClient } from './tooljetClient.js';

/**
 * ToolJet's Map loads Google Maps with the instance's GOOGLE_MAPS_API_KEY (public config). Without it the component
 * renders a Google error (cmp-map, 2026-09-26), and a model building the app cannot see the key. Returns the refusal
 * for a write that adds a Map when the instance is known to have no key; undefined otherwise (key set, no Map, or unknown).
 * The refusal names the UI 2.0 Map (ShadMap, open tiles, no key): until 2026-10-16 it named only a Table, and two UI 2.0
 * map requests followed it to an Html drawing and a partial build. In a UI 2.0 app that is the whole answer.
 */
export async function mapKeyRefusal(
  client: ToolJetClient,
  componentTypes: Iterable<string>,
  library?: ComponentLibrary,
): Promise<string | undefined> {
  if (![...componentTypes].includes('Map') || typeof client?.hasGoogleMapsKey !== 'function') return undefined;
  let hasKey: boolean | undefined;
  try { hasKey = await client.hasGoogleMapsKey(); } catch { return undefined; }
  if (hasKey !== false) return undefined;
  const noKey = 'This ToolJet instance has no Google Maps API key (GOOGLE_MAPS_API_KEY), so a Map component shows a Google error ' +
    'instead of a map.';
  const ui2Map = 'Use ShadMap, the ToolJet UI 2.0 Map: OpenStreetMap tiles, no key, one marker per data row read through ' +
    'latField, lngField and idField, with onMarkerClick and selectedMarker.';
  if (library === 'ui2') return `${noKey} ${ui2Map}`;
  return `${noKey} In a ToolJet UI 2.0 app: ${ui2Map} In a UI 1.0 app, show the locations in a Table (a link column to ` +
    'https://www.google.com/maps?q=<lat>,<lng> opens each one), and tell the user in your reply that an in-app map needs the ' +
    'Google Maps API key on the instance.';
}
