import { describe, expect, it } from 'vitest';
import { packTableLook } from '../src/packTableLook.js';
import { polishFlexRows } from '../src/flexPolish.js';
import type { ComponentSpec } from '../src/tooljetClient.js';

const c = (name: string, type: string, styles: Record<string, unknown> = {}): ComponentSpec =>
  ({ name, type, clientRef: name, properties: {}, styles }) as ComponentSpec;
const look = (cs: ComponentSpec[], name: string) =>
  (cs.find((x) => x.name === name)?.styles?.tableLook as { value?: unknown } | undefined)?.value;

describe('packTableLook', () => {
  it('gives a Table on a page of pack widgets the shadcn look (a clinic table came out in the ToolJet look, status as plain text)', () => {
    const { components, warnings } = packTableLook([c('hero', 'ShadHero'), c('stats', 'ShadStat'), c('agenda', 'Table')]);
    expect(look(components, 'agenda')).toBe('shadcn');
    expect(warnings.join(' ')).toContain('agenda');
  });

  it('keeps a look the build chose, and pages without pack widgets', () => {
    expect(look(packTableLook([c('h', 'ShadHero'), c('t', 'Table', { tableLook: { value: 'default' } })]).components, 't')).toBe('default');
    expect(look(packTableLook([c('h', 'Text'), c('t', 'Table')]).components, 't')).toBeUndefined();
  });

  it('runs in the page polish', () => {
    expect(look(polishFlexRows([c('hero', 'ShadHero'), c('agenda', 'Table')]).components, 'agenda')).toBe('shadcn');
  });
});
