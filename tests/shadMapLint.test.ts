import { describe, expect, it, vi } from 'vitest';
import { lintShadMaps } from '../src/shadMapLint.js';
import { lintComponents } from '../src/lint.js';
import { mapKeyRefusal } from '../src/mapKeyGuard.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

// The UI 2.0 Map (ShadMap) in agent builds (2026-10-16): the agent learnt maps from the Google Map's entry, and two UI 2.0
// map requests ended as an Html drawing and a partial build. These are the mistakes a ShadMap plan makes.
const map = (props: Record<string, unknown>, name = 'stopsMap') => ({
  name,
  type: 'ShadMap',
  properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, { value: v }])),
});
const text = (r: { errors: string[]; warnings: string[] }) => [...r.errors, ...r.warnings].join(' ');

describe('a ShadMap whose coordinates are text', () => {
  it('is refused when a row holds lat or lng as words or degrees, which the map skips', () => {
    const r = lintShadMaps([map({ data: [{ id: 1, lat: '51.5074° N', lng: '0.1278° W' }, { id: 2, lat: 51.5, lng: -0.12 }] })]);
    expect(r.errors.join(' ')).toMatch(/stopsMap[\s\S]*lat[\s\S]*lng[\s\S]*numbers/);
  });

  it('is refused the same in a {{ [...] }} binding of literal rows', () => {
    const r = lintShadMaps([map({ data: '{{ [{ "id": 1, "lat": "north", "lng": "west" }] }}' })]);
    expect(r.errors).toHaveLength(1);
  });

  it('is refused when the centre is a place name rather than coordinates', () => {
    const r = lintShadMaps([map({ data: [], defaultCenter: 'London' })]);
    expect(r.errors.join(' ')).toMatch(/defaultCenter[\s\S]*lat[\s\S]*lng/);
  });

  it('passes numbers, numeric text and a "lat, lng" centre, which the map reads', () => {
    const r = lintShadMaps([map({ data: [{ id: 1, lat: '51.5', lng: '-0.12' }, { id: 2, lat: 51.4, lng: -0.1 }], defaultCenter: '51.5, -0.12' })]);
    expect(text(r)).toBe('');
  });
});

describe('a ShadMap field property that is not a field name', () => {
  it('is refused: latField names the field each row is read through, it is not a value', () => {
    const r = lintShadMaps([map({ data: '{{queries.stops.data}}', latField: '{{queries.stops.data[0].lat}}', lngField: 51.5 })]);
    expect(r.errors.join(' ')).toMatch(/latField[\s\S]*field name/);
    expect(r.errors.join(' ')).toMatch(/lngField/);
  });

  it('passes plain field names', () => {
    expect(text(lintShadMaps([map({ data: '{{queries.stops.data}}', latField: 'latitude', lngField: 'longitude', idField: 'stop_ref' })]))).toBe('');
  });
});

describe('ShadMap markers without their id field', () => {
  it('warns when rows mapped for the map drop the id', () => {
    const r = lintShadMaps([map({ data: '{{ queries.stops.data.map(s => ({ lat: s.lat, lng: s.lng, title: s.customer })) }}' })]);
    expect(r.warnings.join(' ')).toMatch(/stopsMap[\s\S]*id[\s\S]*selectedMarkerId/);
  });

  it('warns when literal rows have no id', () => {
    expect(lintShadMaps([map({ data: [{ lat: 51.5, lng: -0.12 }] })]).warnings).toHaveLength(1);
  });

  it('passes rows that keep the id, spread the row, or name their key with idField', () => {
    for (const data of [
      '{{ queries.stops.data.map(s => ({ id: s.id, lat: s.lat, lng: s.lng })) }}',
      '{{ queries.stops.data.map(s => ({ ...s, lat: Number(s.lat) })) }}',
      '{{ queries.stops.data }}',
    ]) expect(text(lintShadMaps([map({ data })])), data).toBe('');
    expect(text(lintShadMaps([map({ data: '{{ queries.stops.data.map(s => ({ stop_ref: s.ref, lat: s.lat, lng: s.lng })) }}', idField: 'stop_ref' })]))).toBe('');
  });
});

describe('the ShadMap checks in a component lint', () => {
  it('run with the other component checks', () => {
    const r = lintComponents([{ ...map({ data: [{ id: 1, lat: 'n/a', lng: 'n/a' }] }), layout: { top: 0, left: 0, width: 20, height: 420 } } as never]);
    expect(r.errors.join(' ')).toMatch(/stopsMap/);
  });
});

describe('the Google Map on an instance without a key', () => {
  const noKey = { hasGoogleMapsKey: async () => false } as unknown as ToolJetClient;

  it('in a UI 2.0 app, is refused with the UI 2.0 Map to use instead', async () => {
    const msg = await mapKeyRefusal(noKey, ['Map'], 'ui2');
    expect(msg).toMatch(/GOOGLE_MAPS_API_KEY[\s\S]*ShadMap[\s\S]*no key/);
    expect(msg).not.toMatch(/Table/);
  });

  it('elsewhere, still names both the UI 2.0 Map and the Table fallback', async () => {
    const msg = (await mapKeyRefusal(noKey, ['Map']))!;
    expect(msg).toMatch(/ShadMap/);
    expect(msg).toMatch(/UI 1\.0[\s\S]*Table/);
  });

  it('is refused by lint_app_spec for a new (UI 2.0) app, naming ShadMap', async () => {
    const client = {
      hasGoogleMapsKey: async () => false,
      getAppSummary: vi.fn().mockResolvedValue(undefined),
      listTables: vi.fn().mockResolvedValue([]),
      listDatasources: vi.fn().mockResolvedValue([]),
      getAppSettings: vi.fn().mockResolvedValue({ globalSettings: {} }),
    } as unknown as ToolJetClient;
    const plan = { pages: [{ name: 'Route', components: [{ client_ref: 'm', name: 'stopsMap', type: 'Map', layout: { top: 0, left: 0, width: 20, height: 42 } }] }] };
    const body = (await lintAppSpecTool(client).handler(plan as never)).content[0]!.text;
    expect(body).toMatch(/ShadMap/);
    expect(body).not.toMatch(/Show the locations in a Table/);
  });
});
