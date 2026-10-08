import { describe, expect, it } from 'vitest';
import { getComponentSchema } from '../src/catalog.js';

// rn41 (2026-10-01): the catalog listed only `label` for RadioButtonV2, so a build filtered a table by
// components.planFilter.label, which is the field's caption, and the Members table always read empty. At runtime the
// widget sets value, options, isValid and label (RadioButtonV2.jsx).
describe('RadioButtonV2 exposed variables', () => {
  const exposed = () => (getComponentSchema('RadioButtonV2') as any).exposedVariables as Array<{ name: string; semantics?: string }>;
  it('include the selected value', () => {
    expect(exposed().map((v) => v.name)).toEqual(expect.arrayContaining(['value', 'options', 'label']));
  });
  it('say that label is the field caption, not the selection', () => {
    expect(exposed().find((v) => v.name === 'label')!.semantics).toMatch(/caption|not the selected/i);
  });
});
