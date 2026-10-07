import { describe, expect, it } from 'vitest';
import { estimateTextHeight, lintComponentSpec, lintComponents } from '../src/lint.js';

const recipe = String.raw`{{(variables.selectedRecipe?.instructions || "").replace(/\n/g,"<br>")}}`;
const textSpec = (text: string, height = 30, dynamicHeight: unknown = false) => ({
  type: 'Text', name: 'instructions',
  properties: { text: { value: text }, dynamicHeight: { value: dynamicHeight } },
  layouts: { desktop: { top: 0, left: 2, width: 39, height } },
});
const clippingErrors = (text: string, height = 30) =>
  lintComponentSpec(textSpec(text, height)).errors.filter(error => error.includes('last line is cut off'));

describe('Text height estimates exclude binding source', () => {
  it.each([
    ['recipe replacement', recipe],
    ['string literal', '{{"first<br>second"}}'],
    ['template string', '{{`first<br>${variables.name}`}}'],
    ['block comment', '{{variables.text /* <br><h1>comment</h1> */}}'],
    ['line comment', '{{variables.text // <br>comment\n}}'],
    ['regex literal', '{{variables.text.replace(/<br>/g, " ")}}'],
    ['embedded closing delimiter', '{{variables.text || "}}<br>fallback"}}'],
    ['nested object', '{{({inner: {text: "<br>"}}).inner.text}}'],
  ])('does not infer rendered lines from %s', (_label, text) => {
    expect(estimateTextHeight(text, 14)).toMatchObject({ lines: 0, sizes: [] });
    expect(clippingErrors(text)).toEqual([]);
  });

  it('reports no clipping for the recipe binding and adds no warning about it', () => {
    const result = lintComponentSpec(textSpec(recipe));
    expect(result.errors).toEqual([]);
    expect(result.warnings.join(' ')).not.toMatch(/rendered height is unknown/);
  });

  it.each(['first<br>second', 'first<BR />second', 'first\nsecond'])('keeps literal multiline content blocking: %s', text => {
    expect(estimateTextHeight(text, 14)).toMatchObject({ lines: 2, px: 48, sizes: [14, 14] });
    expect(clippingErrors(text)).toHaveLength(1);
    expect(clippingErrors(text, 60)).toEqual([]);
  });

  it('keeps literal heading, block and font-size estimates', () => {
    const text = '<h1>Instructions</h1><p style="font-size:20px">Steps</p>';
    expect(estimateTextHeight(text, 14)).toMatchObject({ lines: 2, sizes: [28, 20] });
    expect(clippingErrors(text)).toHaveLength(1);
  });

  it.each([
    `First ${recipe}<br>Second`,
    'First {{variables.text /* <br> */}}<br>Second {{variables.other}}',
    'First {{variables.text || "}}<br>fallback"}}<br>Second',
  ])('retains the visible static minimum around bindings: %s', text => {
    expect(estimateTextHeight(text, 14)).toMatchObject({ lines: 2, px: 48, sizes: [14, 14] });
    expect(clippingErrors(text)).toHaveLength(1);
    expect(clippingErrors(text, 60)).toEqual([]);
  });

  it('does not invent visible content or styles for an unknown binding result', () => {
    const text = 'Steps<br>{{variables.text || "<span style=\'font-size:100px\'>big</span>"}}';
    expect(estimateTextHeight(text, 14)).toMatchObject({ lines: 1, px: 27, sizes: [14] });
    expect(clippingErrors(text)).toEqual([]);
  });

  it('does not treat an unparseable binding tail as rendered HTML', () => {
    const text = 'First<br>Second {{variables.text + "<br>" + }}';
    expect(estimateTextHeight(text, 14)).toMatchObject({ lines: 2, px: 48 });
    expect(clippingErrors(text)).toHaveLength(1);
    expect(lintComponentSpec(textSpec('{{variables.text + "<br>" + }}')).errors.join(' '))
      .toMatch(/invalid JavaScript binding syntax/);
  });

  it('never executes a binding while estimating or linting', () => {
    const key = '__textHeightBindingExecuted';
    const text = `{{(globalThis.${key} = true, "first<br>second")}}`;
    expect(Reflect.has(globalThis, key)).toBe(false);
    expect(estimateTextHeight(text, 14)).toMatchObject({ lines: 0 });
    expect(clippingErrors(text)).toEqual([]);
    expect(Reflect.has(globalThis, key)).toBe(false);
  });

  it('still blocks an unusably short line box for dynamic text', () => {
    expect(lintComponents([textSpec(recipe, 10)]).errors.join(' ')).toMatch(/too short to render one line/);
  });
});

// Self-review of the binding-source change (2026-10-06): a line that is only a binding stopped counting, so a
// three-line contact card at 30px passed silently. It still never blocks (the binding may render empty), but warns.
describe('lines that are only a binding', () => {
  const warningsFor = (text: string, height = 30) =>
    lintComponentSpec(textSpec(text, height)).warnings.filter(warning => warning.includes('likely cut off'));
  it('warn when one line each would not fit', () => {
    const text = '{{queries.a.data.name}}<br>{{queries.a.data.email}}<br>{{queries.a.data.phone}}';
    expect(clippingErrors(text)).toEqual([]);
    expect(warningsFor(text)).toHaveLength(1);
    expect(warningsFor(text, 80)).toEqual([]);
    expect(warningsFor('<b>Name</b><br>{{x}}')).toHaveLength(1);
  });
  it('stay silent for a text that is one binding', () => {
    expect(warningsFor(recipe)).toEqual([]);
    expect(warningsFor('{{"first<br>second"}}')).toEqual([]);
  });
});
