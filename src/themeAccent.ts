/* The accent of a theme, checked when the theme is created. Without palette guidance the models fell back to their
   favourites: near-black (DeepSeek), grey or stock blue primaries, and the apps read plain (2026-10-12). The menu is
   mid-saturation colours that carry white button text; pick by the request's brand, industry or mood, and vary. */

export const ACCENT_MENU = [
  { name: 'Indigo', hex: '#4F46E5', fits: 'software, analytics, internal tools' },
  { name: 'Violet', hex: '#7C3AED', fits: 'creative, education, product teams' },
  { name: 'Fuchsia', hex: '#C026D3', fits: 'consumer, beauty, events' },
  { name: 'Rose', hex: '#E11D48', fits: 'hospitality, retail, food' },
  { name: 'Coral', hex: '#EA580C', fits: 'logistics, field service, sports' },
  { name: 'Amber', hex: '#B45309', fits: 'manufacturing, construction, real estate' },
  { name: 'Emerald', hex: '#059669', fits: 'finance, sustainability, health' },
  { name: 'Teal', hex: '#0D9488', fits: 'healthcare, travel, operations' },
  { name: 'Sky', hex: '#0284C7', fits: 'support, IT, aviation, marine' },
] as const;

const MENU_TEXT = ACCENT_MENU.map((a) => `${a.name} ${a.hex} (${a.fits})`).join(', ');

const hsl = (hex: string): { h: number; s: number; l: number } | null => {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  const full = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
};

/** A warning for a theme whose primary is near-black, grey or the stock blue, naming the accent menu; null otherwise. */
export const accentWarning = (definition: unknown): string | null => {
  const light = (definition as { brand?: { colors?: { primary?: { light?: unknown } } } })?.brand?.colors?.primary?.light;
  if (typeof light !== 'string') return null;
  const c = hsl(light);
  if (!c) return null;
  const kind =
    c.l < 0.22 ? 'near-black' : c.s < 0.2 ? 'grey' : c.h >= 212 && c.h <= 226 && c.s > 0.75 && c.l >= 0.45 && c.l <= 0.66 ? 'the stock blue' : null;
  if (!kind) return null;
  return (
    `The theme's primary ${light} is ${kind}, which reads plain. Unless the request names this colour or the brand ` +
    `uses it, pick an accent from the menu by the request's brand, industry or mood: ${MENU_TEXT}. Keep the canvas and ` +
    'neutrals light and lightly tinted toward it.'
  );
};
