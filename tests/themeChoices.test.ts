import { describe, expect, it } from 'vitest';
import { definitionFromChoices, themeDefinition } from '../src/tools/manageTheme.js';

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('definitionFromChoices', () => {
  it('needs a primary', () => {
    expect(definitionFromChoices({})).toBeUndefined();
  });

  it('makes a definition the schema accepts, with the choices in it', () => {
    const definition = definitionFromChoices({ primary: '#0D9488', font: 'Manrope', radius: 10 })!;
    expect(() => themeDefinition.parse(definition)).not.toThrow();
    expect(definition.brand.colors.primary.light).toBe('#0D9488');
    expect(definition.text.font).toBe('Manrope');
    expect(definition.border.radius).toEqual({ default: 10, small: 8, large: 14 });
  });

  it('gives two accents different neutrals, not the same greys', () => {
    const teal = definitionFromChoices({ primary: '#0D9488' })!;
    const rose = definitionFromChoices({ primary: '#E11D48' })!;
    for (const pick of [
      (d: typeof teal) => d.surface.colors.appBackground.light,
      (d: typeof teal) => d.surface.colors.surface2.dark,
      (d: typeof teal) => d.border.colors.default.light,
      (d: typeof teal) => d.text.colors.primary.light,
    ]) expect(pick(teal)).not.toBe(pick(rose));
  });

  it.each(['#4F46E5', '#E11D48', '#B45309', '#059669', '#0284C7'])('keeps text readable on every surface with %s', (primary) => {
    const d = definitionFromChoices({ primary })!;
    for (const surface of Object.values(d.surface.colors)) {
      expect(contrast(d.text.colors.primary.light, surface.light)).toBeGreaterThan(7);
      expect(contrast(d.text.colors.primary.dark, surface.dark)).toBeGreaterThan(7);
    }
  });
});
