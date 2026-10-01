import { describe, expect, it } from 'vitest';
import { lintComponentSlots, lintRenderedText } from '../src/lint.js';

describe('Accordion slots', () => {
  it('take header and body children like a Container', () => {
    const slots = (parentType: string) => lintComponentSlots([
      { clientRef: 'acc', name: 'acc', type: parentType },
      { name: 'title', type: 'Text', parentRef: 'acc', slotName: 'header' },
      { name: 'detail', type: 'Text', parentRef: 'acc', slotName: 'body' },
    ] as never);
    expect(slots('Accordion')).toEqual([]);
    expect(slots('Table').join(' ')).toMatch(/header and body also to Accordion/);
  });
});

describe('Steps with advanced on', () => {
  // Steps.jsx reads advanced ? schema : steps, so a dynamic schema is authored items.
  it('reads its items from schema', () => {
    expect(lintRenderedText({ name: 's', type: 'Steps', properties: { advanced: { value: '{{true}}' }, schema: { value: '{{[{id:1,name:"A"}]}}' }, steps: { value: [] } } } as never)).toEqual([]);
    expect(lintRenderedText({ name: 's', type: 'Steps', properties: { steps: { value: [] } } } as never).join(' ')).toMatch(/placeholder items/);
  });
});
