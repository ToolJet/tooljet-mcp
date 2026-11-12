import { describe, expect, it } from 'vitest';
import { packDefaultDefinition } from '../src/packDefaults.js';

const prop = (type: string, key: string) =>
  (packDefaultDefinition(type)?.properties?.[key] as { value?: unknown } | undefined)?.value;

describe('pack defaults for agent-built components', () => {
  it('leave out sample text a build did not ask for (a todo hero showed "14 bookings, 3 need a reply")', () => {
    expect(prop('ShadHero', 'meta')).toBe('{{[]}}');
    expect(prop('ShadHero', 'eyebrow')).toBe('');
    expect(prop('ShadHero', 'subtitle')).toBe('');
    expect(prop('ShadHero', 'actionLabel')).toBe('');
    expect(prop('ShadCardGrid', 'metaFields')).toBe('');
    expect(prop('ShadCardGrid', 'badgeField')).toBe('');
    expect(prop('ShadRecordList', 'metaFields')).toBe('');
    expect(prop('ShadTags', 'tags')).toBe('{{[]}}');
    expect(prop('ShadCombobox', 'searchPlaceholder')).toBe('Search...');
  });

  it('keep neutral defaults', () => {
    expect(prop('ShadHero', 'background')).toBe('tint');
    expect(prop('ShadStat', 'currency')).toBe('USD');
  });
});
