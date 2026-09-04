import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards the catalog hints that the height lint rules key off.
 *
 * `lintStandardSingleLineInputHeight` treats `renderingHints.compactFormHeight` as the marker for
 * "this control keeps its catalog-default height", deliberately reading the catalog instead of
 * duplicating a component list. That is the right shape, and it means the rule's coverage is
 * exactly the hint's coverage: a single-line input without the hint is silently exempt from the
 * rule, and can still be authored three times too tall.
 *
 * This is not theoretical. The oversized-input bug came from a lint message reporting a component's
 * RENDERED height, the model writing that number back as the AUTHORED height, and the renderer
 * adding its 20px label offset again, so every labelled field grew 20px per lint cycle. The fix
 * covers the hinted components. These tests exist so the un-hinted ones cannot quietly grow.
 */

interface ComponentSchema {
  defaultSize?: { height?: number };
  properties?: Array<{ key?: string }>;
  renderingHints?: Record<string, unknown>;
}

const catalog: Record<string, ComponentSchema> = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'data', 'component-schemas.json'), 'utf8')
);

const SINGLE_LINE_HEIGHT = 40;

/**
 * A form control in the sense that matters here: it carries a label and holds a value, so ToolJet
 * renders the label inside the component box and adds to its height. Buttons, Text and modals are
 * also 40px tall by default but have neither, which is why height alone is not the test.
 */
function isLabelledValueControl(schema: ComponentSchema): boolean {
  const keys = new Set((schema.properties ?? []).map((property) => property?.key).filter(Boolean));
  return keys.has('label') && (keys.has('value') || keys.has('defaultValue'));
}

function singleLineFormControls(): string[] {
  return Object.entries(catalog)
    .filter(
      ([, schema]) =>
        schema && typeof schema === 'object' && schema.defaultSize?.height === SINGLE_LINE_HEIGHT && isLabelledValueControl(schema)
    )
    .map(([name]) => name)
    .sort();
}

function hasHint(name: string, hint: string): boolean {
  return Boolean(catalog[name]?.renderingHints?.[hint]);
}

/**
 * Single-line controls that carry neither hint today, so the height rule does not apply to them.
 * This list may SHRINK, never grow. Each entry is a control that can still be authored oversized
 * with nothing catching it, so closing them is real work, not bookkeeping — but the immediate job
 * is that no new component joins them by accident.
 */
const UNHINTED_TODAY = [
  'Cascader',
  'PasswordInput',
  'PhoneInput',
  'TagsInput',
  'TimePicker',
] as const;

describe('catalog form-control hints', () => {
  it('does not let a new single-line control skip the height hints unnoticed', () => {
    const unhinted = singleLineFormControls().filter((name) => !hasHint(name, 'compactFormHeight'));

    expect(
      unhinted,
      'A labelled single-line control has no compactFormHeight, so lintStandardSingleLineInputHeight ' +
        'does not apply to it and it can be authored arbitrarily tall. Add the hint in ' +
        'scripts/generate-catalog.mjs and regenerate, or add it to UNHINTED_TODAY with a reason.'
    ).toEqual([...UNHINTED_TODAY]);
  });

  it('never marks a control height-bounded without the label offset that makes it so', () => {
    // compactFormHeight only means anything because formLabelAlignment puts the label inside the
    // box and the renderer adds 20px for it. One without the other is incoherent in that direction.
    const boundedWithoutOffset = Object.keys(catalog)
      .filter((name) => hasHint(name, 'compactFormHeight') && !hasHint(name, 'formLabelAlignment'))
      .sort();

    expect(
      boundedWithoutOffset,
      'A height rule applies to a control whose label does not render inside its box.'
    ).toEqual([]);
  });

  it('keeps the set of label-offset controls with no height bound from growing', () => {
    // The other direction is legitimate for multi-line controls: TextArea carries the 20px label
    // offset but cannot take a fixed height, so compactFormHeight does not fit it. That does NOT
    // make it safe — TextArea ratcheted in production exactly like the inputs did, going from an
    // authored 100 rendering 120, to an authored 120 rendering 140, because nothing bounds what the
    // model may author for it. Closing this needs a rule that bounds variable-height controls,
    // which does not exist yet. Freeze the set meanwhile so nothing new joins it silently.
    const offsetWithoutBound = Object.keys(catalog)
      .filter((name) => hasHint(name, 'formLabelAlignment') && !hasHint(name, 'compactFormHeight'))
      .sort();

    expect(
      offsetWithoutBound,
      'This control gets a 20px label offset from the renderer with no lint rule bounding the height ' +
        'the model authors, which is the shape that ratchets. Bound it, or record it here.'
    ).toEqual(['TextArea']);
  });

  it('keeps the known gap from growing', () => {
    // Guards the list itself: every name in UNHINTED_TODAY must still be a real single-line control.
    // A renamed or removed component should shrink this list rather than leave a dead entry that
    // silently exempts nothing.
    const controls = new Set(singleLineFormControls());
    const stale = UNHINTED_TODAY.filter((name) => !controls.has(name));

    expect(stale, 'UNHINTED_TODAY names a component that is no longer a single-line form control.').toEqual([]);
  });
});
