import { describe, expect, it } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
import { packDefaultDefinition } from '../src/packDefaults.js';

// 2026-10-12: maps in ToolJet UI 2.0: the pack's own key-free Map (ShadMap, Leaflet on open tiles) and the native
// Google Map in the pack's frame (styles.mapLook "shadcn").
const body = (result: any) => JSON.parse(result.content[0].text);
const read = async (type: string, sections = ['overview', 'authoringHints', 'properties']) =>
  body(await getComponentCatalogTool({} as ToolJetClient).handler({ type, sections, detail: 'full' }));
const keys = (entry: any) => (entry.properties ?? []).map((p: any) => p.key);

describe('maps in the ToolJet UI 2.0 catalog', () => {
  it('has the Map with its data fields, events, actions and a usage hint', async () => {
    const map = await read('ShadMap', ['overview', 'authoringHints', 'properties', 'events', 'actions', 'exposedVariables']);
    expect(keys(map)).toEqual(
      expect.arrayContaining([
        'data',
        'latField',
        'lngField',
        'titleField',
        'subtitleField',
        'statusField',
        'idField',
        'popupFields',
        'clusterMarkers',
        'fitToMarkers',
        'defaultCenter',
        'defaultZoom',
        'emptyText',
        'tileUrl',
      ])
    );
    expect(JSON.stringify(map.events)).toMatch(/onMarkerClick/);
    expect(JSON.stringify(map.events)).toMatch(/onMapClick/);
    expect(JSON.stringify(map.events)).toMatch(/onBoundsChange/);
    for (const action of ['setCenter', 'setZoom', 'fitBounds', 'selectMarker', 'clearSelection']) {
      expect(JSON.stringify(map.actions)).toContain(action);
    }
    expect(JSON.stringify(map.exposedVariables)).toMatch(/selectedMarkerId/);
    expect(map.authoringHints.usage).toMatch(/selectedMarker/);
    expect(map.authoringHints.usage).toMatch(/no API key|key-free/);
  });

  it("tells a build the Google Map's UI 2.0 look and when to pick it", async () => {
    const google = await read('Map', ['authoringHints', 'styles']);
    expect(google.authoringHints.look).toMatch(/mapLook/);
    expect(google.authoringHints.look).toMatch(/prefer ShadMap/);
    expect(JSON.stringify(google.styles)).toMatch(/mapLook/);
  });

  it('sends a guessed name to the Map', async () => {
    for (const guess of ['ShadGeoMap', 'ShadLocationMap', 'ShadMarkers', 'ShadDeliveryRoute', 'ShadStoreLocator']) {
      expect((await read(guess, ['overview'])).did_you_mean).toContain('ShadMap');
    }
  });

  it("leaves the sample's delivery stops out of an agent-built Map", () => {
    const prop = (key: string) =>
      (packDefaultDefinition('ShadMap')?.properties?.[key] as { value?: unknown } | undefined)?.value;
    expect(prop('data')).toBe('{{[]}}');
    expect(prop('titleField')).toBe('name');
    expect(prop('subtitleField')).toBe('');
    expect(prop('popupFields')).toBe('');
    expect(prop('latField')).toBe('lat');
    expect(prop('clusterMarkers')).toBe('{{true}}');
  });
});
