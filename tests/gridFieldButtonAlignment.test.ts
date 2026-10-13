import { describe, expect, it } from 'vitest';
import { polishFlexRows } from '../src/flexPolish.js';
import type { ComponentSpec } from '../src/tooljetClient.js';

// A repair form's "Create ticket" button sat at its row's top beside labelled UI 2.0 fields (Luna IT assets build,
// 2026-10-13): the field boxes start 24px down, under their labels, so the button read as floating above them.
// Measured in the browser: a labelled Shad field's box runs 24 to 60px down its widget, and a ShadButton's box is
// its height less 4px, centred. So the button moves 22px down and becomes 40px tall: its box then matches the field's.
const at = (name: string, type: string, top: number, left: number, width: number, height: number, properties: Record<string, unknown> = {}): ComponentSpec => ({
  name, type, clientRef: name, properties, layouts: { desktop: { top, left, width, height } },
});
const desk = (components: ComponentSpec[], name: string) => components.find((c) => c.name === name)!.layouts!.desktop!;

describe('polishFlexRows: grid buttons beside labelled UI 2.0 fields', () => {
  it('moves a button at the row top onto the field boxes', () => {
    const r = polishFlexRows([
      at('vendor', 'ShadInput', 508, 2, 9, 64, { label: { value: 'Vendor' } }),
      at('cost', 'ShadCurrencyInput', 508, 12, 9, 64, { label: { value: 'Estimated cost' } }),
      at('create', 'ShadButton', 508, 32, 9, 36, { text: { value: 'Create ticket' } }),
    ]);
    expect(desk(r.components, 'create')).toMatchObject({ top: 530, height: 40 });
    expect(r.warnings.join(' ')).toMatch(/"create".*field boxes/);
  });

  it('leaves buttons alone when the fields have no label, the button is already low, or it is in another row', () => {
    const unlabelled = polishFlexRows([at('q', 'ShadInput', 100, 2, 9, 40), at('go', 'ShadButton', 100, 12, 6, 40)]);
    expect(desk(unlabelled.components, 'go')).toMatchObject({ top: 100, height: 40 });
    const aligned = polishFlexRows([at('q', 'ShadInput', 100, 2, 9, 64, { label: { value: 'Find' } }), at('go', 'ShadButton', 122, 12, 6, 40)]);
    expect(desk(aligned.components, 'go')).toMatchObject({ top: 122 });
    const below = polishFlexRows([at('q', 'ShadInput', 100, 2, 9, 64, { label: { value: 'Find' } }), at('go', 'ShadButton', 200, 2, 6, 36)]);
    expect(desk(below.components, 'go')).toMatchObject({ top: 200, height: 36 });
    expect(aligned.warnings.concat(unlabelled.warnings, below.warnings).join(' ')).not.toMatch(/field boxes/);
  });
});
