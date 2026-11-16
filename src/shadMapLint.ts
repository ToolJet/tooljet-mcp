import JSON5 from 'json5';

/* The ToolJet UI 2.0 Map (ShadMap) draws one marker per data row, read through latField, lngField and idField. Agent
   builds learnt maps from the Google Map until 2026-10-16; these are the mistakes a ShadMap plan makes that the map
   itself only shows as missing pins or a click that selects nothing:
   - coordinates written as text the map cannot read ("51.5074° N"), or a centre written as a place name: the row is
     skipped, the map opens elsewhere;
   - a field property given a value instead of the name of the field each row is read through;
   - rows reshaped for the map without their id: selectedMarkerId is null and selectMarker(id) finds nothing. */

interface Spec {
  name?: string;
  type?: string;
  properties?: Record<string, unknown>;
}

const FIELD_PROPS = ['latField', 'lngField', 'idField', 'titleField', 'subtitleField', 'statusField', 'labelField', 'iconField',
  'routeField', 'routeOrderField', 'heatField', 'areaShapeField', 'areaTitleField', 'areaStatusField', 'areaRadiusField'];
const POINT_PROPS = ['defaultCenter', 'routeStart', 'defaultPickedLocation'];
const NUMBER = /^\s*[+-]?(\d+(\.\d*)?|\.\d+)\s*$/;
const LAT_LNG_TEXT = /^\s*[+-]?(\d+(\.\d*)?|\.\d+)\s*,\s*[+-]?(\d+(\.\d*)?|\.\d+)\s*$/;

const valueOf = (props: Record<string, unknown> | undefined, key: string): unknown => {
  const entry = props?.[key] as { value?: unknown } | undefined;
  return entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry ? entry.value : entry;
};

/** The inside of a value that is one whole {{ binding }}, or undefined. */
const bindingBody = (value: unknown): string | undefined =>
  typeof value === 'string' ? /^\s*\{\{([\s\S]*)\}\}\s*$/.exec(value)?.[1]?.trim() : undefined;

/** A literal written as itself or as a binding of a literal ({{ [...] }}, {{ "lat" }}); undefined when it is code. */
function literal(value: unknown): { value: unknown } | undefined {
  const body = bindingBody(value);
  if (body === undefined) return typeof value === 'string' && value.includes('{{') ? undefined : { value };
  try { return { value: JSON5.parse(body.replace(/^\(([\s\S]*)\)$/, '$1')) }; } catch { return undefined; }
}

/** A coordinate the map reads: a number, or numeric text. */
const readable = (v: unknown): boolean => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && NUMBER.test(v));

/** A centre the map reads: { lat, lng }, [lat, lng] or 'lat, lng' (empty is unset). */
function readablePoint(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (typeof v === 'string') return LAT_LNG_TEXT.test(v);
  if (Array.isArray(v)) return v.length >= 2 && readable(v[0]) && readable(v[1]);
  if (typeof v === 'object') return readable((v as Record<string, unknown>).lat) && readable((v as Record<string, unknown>).lng);
  return false;
}

/** Whether rows reshaped in a binding (.map(r => ({ ... }))) keep the key field: written, shorthand, or the row spread. */
function reshapedWithout(body: string, idKey: string): boolean {
  if (!/=>\s*\(\s*\{/.test(body) || /\.\.\./.test(body)) return false;
  const key = idKey.replace(/[$]/g, '\\$&');
  return !new RegExp(`(^|[{,\\s])["']?${key}["']?\\s*(:|,|\\})`).test(body);
}

export function lintShadMaps(components: Spec[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const c of components.filter((component) => component.type === 'ShadMap')) {
    const label = `ShadMap "${c.name ?? 'ShadMap'}"`;
    const props = c.properties;
    const field = (key: string, fallback: string) => {
      const written = literal(valueOf(props, key));
      return written && typeof written.value === 'string' && written.value.trim() ? written.value.trim() : fallback;
    };

    const notNames = FIELD_PROPS.filter((key) => {
      const raw = valueOf(props, key);
      if (raw === undefined || raw === null || raw === '') return false;
      const written = literal(raw);
      return !written || typeof written.value !== 'string' || written.value.includes('{{');
    });
    if (notNames.length) {
      errors.push(`${label}: ${notNames.join(', ')} must each be a field name, the key each data row is read through ` +
        `(latField: "lat", idField: "stop_ref"), not a value or an expression. Put the rows in data and name their fields here.`);
    }

    const [latKey, lngKey, idKey] = [field('latField', 'lat'), field('lngField', 'lng'), field('idField', 'id')];
    const dataRaw = valueOf(props, 'data');
    const rows = literal(dataRaw)?.value;
    if (Array.isArray(rows)) {
      const records = rows.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row));
      const textual = records.filter((row) => [row[latKey], row[lngKey]].some((v) => v !== undefined && v !== null && !readable(v)));
      if (textual.length) {
        const sample = textual[0]!;
        errors.push(`${label}: ${textual.length} row(s) give ${latKey} and ${lngKey} as text the map cannot read ` +
          `(${JSON.stringify(sample[latKey])}, ${JSON.stringify(sample[lngKey])}), so their markers are skipped. ` +
          'Give lat and lng as numbers in decimal degrees (51.5074, -0.1278).');
      }
      const unkeyed = records.filter((row) => row[idKey] === undefined || row[idKey] === null || row[idKey] === '');
      if (unkeyed.length) {
        warnings.push(`${label}: ${unkeyed.length} row(s) have no ${idKey}, so a click on their marker leaves selectedMarkerId ` +
          `empty and selectMarker cannot find them. Give each row a unique ${idKey}, or name the key field with idField.`);
      }
    } else {
      const body = bindingBody(dataRaw);
      if (body && reshapedWithout(body, idKey)) {
        warnings.push(`${label}: data reshapes the rows without their ${idKey}, so a click on a marker leaves selectedMarkerId ` +
          `empty and selectMarker cannot find it. Keep the key in each row (${idKey}: r.${idKey}, or ...r), or name it with idField.`);
      }
    }

    const badPoints = POINT_PROPS.filter((key) => {
      const raw = valueOf(props, key);
      const written = literal(raw);
      return written !== undefined && !readablePoint(written.value);
    });
    if (badPoints.length) {
      errors.push(`${label}: ${badPoints.join(', ')} must be coordinates, { lat, lng } numbers or "lat, lng" text ` +
        '(51.5074, -0.1278), not a place name. Leave defaultCenter empty to open on the markers.');
    }
  }
  return { errors, warnings };
}
