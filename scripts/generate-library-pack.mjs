// Experiment (exp/packs-adapter): exposes one published custom-component library to the agent as ordinary component
// types, `Lib_<pack>_<Component>`, generated from the library's manifest (what `tooljet library build` writes).
//
// Writes data/library-pack.json (the library's identity, read by src/libraryPack.ts when a component is saved) and
// adds a catalogue entry and a default definition per component to data/component-schemas.json and
// data/pack-default-definitions.json, so get_component_catalog, the lint and create calls treat them like any type.
//
//   node scripts/generate-library-pack.mjs <manifest.json> <libraryId> <correlationId> <libraryName> <version> <pack>
//     [styles.json: { Component: [styleName...] } — the CLI's manifest records no Styles-tab values]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [manifestPath, libraryId, correlationId, libraryName, version, pack, stylesPath] = process.argv.slice(2);
if (!pack) throw new Error('usage: generate-library-pack.mjs <manifest> <libraryId> <correlationId> <libraryName> <version> <pack> [styles.json]');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const stylesOf = stylesPath ? JSON.parse(readFileSync(stylesPath, 'utf8')) : {};
const prefix = `Lib_${pack}_`;

const words = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
const eventLabel = (s) => words(s).replace(/ (\w)/g, (_, c) => ` ${c.toLowerCase()}`);
const VALUE_TYPE = { string: 'string', number: 'number', boolean: 'boolean', array: 'array', object: 'object', enumeration: 'string' };
// The definition value a manifest default is stored as: the editor's drop stamping (libraryComponentDefaults.ts).
const stamp = (prop) => {
  if (prop.default === undefined) return prop.type === 'boolean' ? '{{false}}' : '';
  if (prop.type === 'boolean') return `{{${prop.default}}}`;
  if (prop.type === 'enumeration' || prop.type === 'string') return prop.default;
  return `{{${JSON.stringify(prop.default)}}}`;
};

const schemasPath = resolve(root, 'data/component-schemas.json');
const defaultsPath = resolve(root, 'data/pack-default-definitions.json');
const schemas = JSON.parse(readFileSync(schemasPath, 'utf8'));
const defaults = JSON.parse(readFileSync(defaultsPath, 'utf8'));
for (const key of Object.keys(schemas)) if (key.startsWith(prefix)) delete schemas[key];
for (const key of Object.keys(defaults.definitions)) if (key.startsWith(prefix)) delete defaults.definitions[key];

const components = {};
for (const [name, entry] of Object.entries(manifest.components)) {
  const type = `${prefix}${name}`;
  const props = entry.props ?? [];
  components[name] = { type, props: props.map((p) => p.name), events: (entry.events ?? []).map((e) => e.name), styles: stylesOf[name] ?? [], actions: (entry.actions ?? []).map((a) => a.name) };
  schemas[type] = {
    type,
    name: type,
    description: `${entry.displayName ?? words(name)} from the ${libraryName} component library (a custom component library published to this workspace).`,
    defaultSize: { width: entry.defaultWidth ?? 6, height: (entry.defaultHeight ?? 4) * 10 },
    properties: [
      ...props.map((p) => ({
        key: p.name,
        label: p.label ?? words(p.name),
        valueType: VALUE_TYPE[p.type] ?? 'string',
        ...(p.default !== undefined ? { default: stamp(p) } : {}),
        ...(p.enumValues ? { allowedValues: p.enumValues } : {}),
        ...(p.description ? { description: p.description } : {}),
      })),
      { key: 'visibility', label: 'Visibility', valueType: 'boolean', default: '{{true}}' },
      { key: 'loadingState', label: 'Loading state', valueType: 'boolean', default: '{{false}}' },
    ],
    styles: [...(stylesOf[name] ?? []).map((key) => ({ key, label: words(key), valueType: 'string' })), { key: 'boxShadow', label: 'Box shadow', valueType: 'string' }],
    events: (entry.events ?? []).map((e) => ({ id: e.name, label: eventLabel(e.name) })),
    actions: [
      ...(entry.actions ?? []).map((a) => ({
        handle: a.name,
        displayName: a.displayName ?? words(a.name),
        ...(a.params?.length ? { params: a.params.map((p) => ({ handle: p.handle, displayName: p.displayName ?? words(p.handle) })) } : {}),
      })),
      { handle: 'setVisibility', displayName: 'Set visibility', params: [{ handle: 'visibility', displayName: 'Value', defaultValue: '{{false}}' }] },
      { handle: 'setLoading', displayName: 'Set loading', params: [{ handle: 'loading', displayName: 'Value', defaultValue: '{{false}}' }] },
    ],
    // Every useStateX value is published under its own name.
    exposedVariables: [...props.map((p) => ({ name: p.name, ...(p.default !== undefined ? { default: p.default } : {}) })), { name: 'isVisible', default: true }, { name: 'isLoading', default: false }],
  };
  defaults.definitions[type] = {
    properties: {
      ...Object.fromEntries(props.map((p) => [p.name, { value: stamp(p) }])),
      visibility: { value: '{{true}}' },
      loadingState: { value: '{{false}}' },
    },
    styles: { boxShadow: { value: '0px 0px 0px 0px #00000040' } },
    others: { showOnDesktop: { value: '{{true}}' }, showOnMobile: { value: '{{false}}' } },
  };
}

writeFileSync(schemasPath, JSON.stringify(schemas, null, 2) + '\n');
writeFileSync(defaultsPath, JSON.stringify(defaults, null, 1) + '\n');
writeFileSync(
  resolve(root, 'data/library-pack.json'),
  JSON.stringify({ pack, prefix, libraryId, correlationId, libraryName, version, components }, null, 2) + '\n'
);
console.log(`${libraryName} ${version}: ${Object.keys(components).length} component types (${prefix}*)`);
