import { describe, expect, it } from 'vitest';
import { lintRenderedGeometry, lintToolbarButtonAlignment } from '../src/lint.js';

const input = (name: string, left: number, top = 165) => ({
  type: 'TextInput', name,
  properties: { label: { value: 'Search' } },
  styles: { alignment: { value: 'top' } },
  layouts: { desktop: { top, left: left, width: 10, height: 40 } },
});
const button = (top: number, left = 33) => ({ type: 'Button', name: 'add', layouts: { desktop: { top, left, width: 8, height: 40 } } });

describe('toolbar button alignment', () => {
  it('flags a button authored at the top of a top-labelled input row', () => {
    const errors = lintToolbarButtonAlignment([input('search', 2), input('priority', 23), button(165)]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('top to 185');
    expect(errors[0]).toContain('label band');
  });

  it('accepts a button aligned with the field boxes', () => {
    expect(lintToolbarButtonAlignment([input('search', 2), button(185)])).toEqual([]);
  });

  it('ignores side-labelled inputs, other rows, and other parents', () => {
    const side = { ...input('side', 2), styles: { alignment: { value: 'side' } } };
    expect(lintToolbarButtonAlignment([side, button(165)])).toEqual([]);
    expect(lintToolbarButtonAlignment([input('search', 2), button(300)])).toEqual([]);
    expect(lintToolbarButtonAlignment([{ ...input('search', 2), parent: 'modal1' }, button(165)])).toEqual([]);
  });

  it('is part of the page geometry lint', () => {
    expect(lintRenderedGeometry([input('search', 2), button(165)]).some((e) => e.includes('label band'))).toBe(true);
  });
});
