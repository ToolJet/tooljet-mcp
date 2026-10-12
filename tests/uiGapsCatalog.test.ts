import { describe, expect, it } from 'vitest';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';
import { packDefaultDefinition } from '../src/packDefaults.js';

// 2026-10-12: the five component gaps blind design reviews found in the ToolJet UI 2.0 pack: a progress list, row
// actions as icons or a menu, a schedule, card grid options and a hero aside. Each needs its catalog entry and hint.
const body = (result: any) => JSON.parse(result.content[0].text);
const read = async (type: string, sections = ['overview', 'authoringHints', 'properties']) =>
  body(await getComponentCatalogTool({} as ToolJetClient).handler({ type, sections, detail: 'full' }));
const keys = (entry: any) => (entry.properties ?? []).map((p: any) => p.key);
const prop = (type: string, key: string) =>
  (packDefaultDefinition(type)?.properties?.[key] as { value?: unknown } | undefined)?.value;

describe('ToolJet UI 2.0 component gaps in the catalog', () => {
  it('has the Progress list and the Schedule, with their data fields and a usage hint', async () => {
    const progress = await read('ShadProgressList');
    expect(keys(progress)).toEqual(
      expect.arrayContaining(['data', 'labelField', 'valueField', 'targetField', 'percentField', 'captionField', 'valueFormat', 'currency'])
    );
    expect(progress.authoringHints.usage).toMatch(/autoTone 'limit'/);
    const schedule = await read('ShadSchedule');
    expect(keys(schedule)).toEqual(
      expect.arrayContaining(['resources', 'bookings', 'startField', 'endField', 'resourceField', 'titleField', 'statusField'])
    );
    expect(schedule.authoringHints.usage).toMatch(/onSlotClick/);
    expect(schedule.authoringHints.usage).toMatch(/selectedSlot/);
  });

  it('has the Card grid options, the progress fields and the Hero aside with its greeting guidance', async () => {
    expect(keys(await read('ShadCardGrid'))).toEqual(
      expect.arrayContaining(['badgeFields', 'eyebrowField', 'avatarField', 'progressField', 'layout'])
    );
    expect(keys(await read('ShadRecordList'))).toContain('progressField');
    const hero = await read('ShadHero');
    expect(keys(hero)).toEqual(expect.arrayContaining(['asideValue', 'asideLabel']));
    expect(hero.authoringHints.usage).toMatch(/Never float a separate Text/);
  });

  it('tells a Table build how to draw row actions and a checkbox column', async () => {
    const table = await read('Table', ['authoringHints']);
    expect(table.authoringHints.rowActionDisplay).toMatch(/buttonDisplay: 'icons'/);
    expect(table.authoringHints.rowActionDisplay).toMatch(/'menu'/);
    expect(table.authoringHints.checkboxSelection).toMatch(/showBulkSelector/);
    expect(table.authoringHints.checkboxSelection).toMatch(/selectedRows/);
  });

  it('sends a guessed name to the new widgets', async () => {
    for (const guess of ['ShadRoster', 'ShadBookings', 'ShadShiftPlanner', 'ShadOnCall']) {
      expect((await read(guess, ['overview'])).did_you_mean).toContain('ShadSchedule');
    }
    for (const guess of ['ShadGoals', 'ShadBudgetBars', 'ShadOnboardingChecklist']) {
      expect((await read(guess, ['overview'])).did_you_mean).toContain('ShadProgressList');
    }
  });

  it('leaves the samples field names out of an agent-built Progress list and Schedule', () => {
    expect(prop('ShadProgressList', 'valueField')).toBe('value');
    expect(prop('ShadProgressList', 'targetField')).toBe('target');
    expect(prop('ShadProgressList', 'statusField')).toBe('');
    expect(prop('ShadSchedule', 'resourceField')).toBe('resource');
    expect(prop('ShadSchedule', 'resourceTitle')).toBe('');
  });
});
