import { beforeAll, describe, expect, it } from 'vitest';
import { packFromBuiltin } from '../src/packCatalog.js';
import { getComponentSchema, registerComponentSchemas } from '../src/catalog.js';
import { lintComponentSpec } from '../src/lint.js';

// 2026-11-13: ToolJet saves every pack component with collapseWhenHidden (its PackComponent definition, read by the
// pack host and the reflow), but the pack schemas left it out, so validate_app and lint_app_spec warned "unknown
// property key" on every pack component of an app.
let pack: ReturnType<typeof packFromBuiltin>;
beforeAll(() => {
  pack = packFromBuiltin({ pack: 'antd', displayName: 'Ant Design', version: '1.0.0' } as never, {
    components: { Text: { props: [{ name: 'children', type: 'string', default: 'Hello' }] } },
  } as never)!;
  registerComponentSchemas(pack!.schemas);
});

const lint = (properties: Record<string, unknown>) =>
  lintComponentSpec({ name: 'note', type: 'Lib_antd_Text', properties, layout: { top: 0, left: 2, width: 20, height: 40 } } as never);

describe('a pack component saved with collapseWhenHidden', () => {
  it('gets no unknown-key warning', () => {
    const { warnings, errors } = lint({ children: 'Hi', collapseWhenHidden: { value: '{{false}}' } });
    expect([...warnings, ...errors].join(' ')).not.toMatch(/collapseWhenHidden/);
  });

  it('is listed in the catalog as a boolean that defaults off', () => {
    const entry = getComponentSchema('Lib_antd_Text')?.properties.find((p) => p.key === 'collapseWhenHidden');
    expect(entry).toMatchObject({ valueType: 'boolean', default: '{{false}}' });
  });

  it('is written with the default definition, as ToolJet saves it', () => {
    expect(pack!.definitions['Lib_antd_Text'].properties.collapseWhenHidden).toEqual({ value: '{{false}}' });
  });

  it('still corrects a misspelt key', () => {
    expect(lint({ collapsewhenhiden: '{{true}}' }).errors.join(' ')).toMatch(/collapseWhenHidden/);
  });
});
