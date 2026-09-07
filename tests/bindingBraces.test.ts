import { describe, expect, it } from 'vitest';
import { separateAdjacentClosingBraces, separateAdjacentClosingBracesDeep } from '../src/bindingBraces.js';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

describe('separateAdjacentClosingBraces', () => {
  it('spaces a nested object close that would end the binding early', () => {
    expect(separateAdjacentClosingBraces("{{({data:[{x:1,marker:{color:'#000'}}]})}}")).toBe(
      "{{({data:[{x:1,marker:{color:'#000'} }]})}}"
    );
  });

  it('spaces an IIFE whose last statement closes an object right before the terminator', () => {
    expect(separateAdjacentClosingBraces('{{(() => { return {a: 1}; })()}}')).toBe('{{(() => { return {a: 1}; })()}}');
    expect(separateAdjacentClosingBraces('{{(() => { return {a: {b: 1}}})()}}')).toBe(
      '{{(() => { return {a: {b: 1} } })()}}'
    );
  });

  it('spaces a projection that ends in "}})" before the terminator', () => {
    expect(separateAdjacentClosingBraces('{{rows.map(r => ({id: r.id, meta: {hub: r.hub}}))}}')).toBe(
      '{{rows.map(r => ({id: r.id, meta: {hub: r.hub} }))}}'
    );
  });

  it('leaves braces inside quoted strings alone', () => {
    const html = "{{'<div style=\"a:{b}}\">' + x + '</div>'}}";
    expect(separateAdjacentClosingBraces(html)).toBe(html);
  });

  it('leaves plain text, single bindings and already-spaced code unchanged', () => {
    for (const text of ['Hello', '{{components.t.value}}', '{{ {a: 1} }}', 'x {{a}} y {{b}}']) {
      expect(separateAdjacentClosingBraces(text)).toBe(text);
    }
  });

  it('walks arrays and objects such as Table columns', () => {
    const columns = [{ key: 'a', cellBackgroundColor: "{{row.x ? {c:{d:1}} : ''}}" }];
    const result = separateAdjacentClosingBracesDeep(columns);
    expect(result.changed).toBe(true);
    expect((result.value as Array<{ cellBackgroundColor: string }>)[0].cellBackgroundColor).toBe(
      "{{row.x ? {c:{d:1} } : ''}}"
    );
    expect(separateAdjacentClosingBracesDeep({ a: 1, b: ['x'] }).changed).toBe(false);
  });
});

describe('normalizeComponentSpec binding braces', () => {
  it('repairs component property bindings and reports the keys it touched', () => {
    const result = normalizeComponentSpec({
      name: 'ch_hub',
      type: 'Chart',
      properties: {
        plotFromJson: '{{true}}',
        jsonDescription: "{{(() => { return {data:[], layout:{legend:{x:1}}}; })()}}",
      },
    } as never);
    expect((result.component.properties.jsonDescription as { value: string }).value).toBe(
      "{{(() => { return {data:[], layout:{legend:{x:1} } }; })()}}"
    );
    expect(result.patch.properties?.jsonDescription).toBeDefined();
    expect(result.warnings.some((w) => w.includes('separated adjacent closing braces') && w.includes('properties.jsonDescription'))).toBe(true);
  });
});
