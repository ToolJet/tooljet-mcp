import { describe, expect, it } from 'vitest';
import { ACCENT_MENU, accentWarning } from '../src/themeAccent.js';

// Apps read plain: with no palette guidance the models fell back to near-black (DeepSeek), grey or stock blue primaries
// (2026-10-12). A theme's primary is checked when it is created, and the warning points at the accent menu.
const theme = (light: string) => ({ brand: { colors: { primary: { light, dark: light } } } });

describe('accentWarning', () => {
  it.each(['#111827', '#000000', '#18181b', '#292524'])('flags a near-black primary %s', (hex) => {
    expect(accentWarning(theme(hex))).toMatch(/near-black/);
  });

  it.each(['#64748b', '#6b7280', '#71717a'])('flags a grey primary %s', (hex) => {
    expect(accentWarning(theme(hex))).toMatch(/grey/);
  });

  it('flags the stock blue', () => {
    expect(accentWarning(theme('#2563EB'))).toMatch(/stock blue/);
    expect(accentWarning(theme('#3b82f6'))).toMatch(/stock blue/);
  });

  it('names the menu in the warning', () => {
    expect(accentWarning(theme('#111827'))).toContain(ACCENT_MENU[0].hex);
  });

  it('is quiet for a lively accent and for every colour on the menu', () => {
    expect(accentWarning(theme('#7C3AED'))).toBeNull();
    expect(accentWarning(theme('#E11D48'))).toBeNull();
    for (const { hex } of ACCENT_MENU) expect(accentWarning(theme(hex))).toBeNull();
  });

  it('ignores a theme without a readable hex primary', () => {
    expect(accentWarning({})).toBeNull();
    expect(accentWarning(theme('var(--x)'))).toBeNull();
  });
});
