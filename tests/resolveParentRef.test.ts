import { describe, expect, it } from 'vitest';
import { resolveParentRef } from '../src/componentParent.js';

const page = [
  { id: '35ffd62e-5d0f-4af3-9c7a-bd5bf4e8888c', name: 'rowTrend' },
  { id: '70e8b03a-2739-4259-abd5-db7a1d71e5ea', name: 'addExpenseSheet' },
  { id: 'dup-1', name: 'card' },
  { id: 'dup-2', name: 'card' },
];

describe('resolveParentRef', () => {
  it('keeps an id, with or without a slot', () => {
    expect(resolveParentRef(page, '35ffd62e-5d0f-4af3-9c7a-bd5bf4e8888c')).toEqual({ ok: true, parent: '35ffd62e-5d0f-4af3-9c7a-bd5bf4e8888c', renamed: false });
    expect(resolveParentRef(page, '70e8b03a-2739-4259-abd5-db7a1d71e5ea-footer')).toMatchObject({ ok: true, renamed: false });
  });

  it('turns a component name into its id (the cards a build parented to "rowTrend" were stored detached)', () => {
    expect(resolveParentRef(page, 'rowTrend')).toEqual({ ok: true, parent: '35ffd62e-5d0f-4af3-9c7a-bd5bf4e8888c', renamed: true });
    expect(resolveParentRef(page, 'addExpenseSheet-footer')).toEqual({
      ok: true,
      parent: '70e8b03a-2739-4259-abd5-db7a1d71e5ea-footer',
      renamed: true,
    });
  });

  it('refuses a parent that matches nothing, or a name two components share', () => {
    expect(resolveParentRef(page, 'rowDetail')).toMatchObject({ ok: false });
    expect(resolveParentRef(page, 'card')).toMatchObject({ ok: false });
  });
});
