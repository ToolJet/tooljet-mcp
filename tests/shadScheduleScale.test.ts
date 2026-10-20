import { expect, it } from 'vitest';
import { lintShadScheduleScale } from '../src/lint.js';

const schedule = (properties: Record<string, unknown>) => ({ id: 'rooms', name: 'rooms', type: 'ShadSchedule', properties });

it('warns when a one-day board is built on the days scale', () => {
  const warnings = lintShadScheduleScale([schedule({ scale: 'days', days: 1 })]);
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toMatch(/scale "hours" with dayStart and dayEnd/);
  expect(lintShadScheduleScale([schedule({ scale: { value: 'days' }, days: { value: '{{1}}' } })])).toHaveLength(1);
});

it('accepts a multi-day overview, a day board with the default days, and bound values', () => {
  expect(lintShadScheduleScale([schedule({ scale: 'days', days: 7 })])).toEqual([]);
  expect(lintShadScheduleScale([schedule({ scale: 'hours', days: '{{7}}' })])).toEqual([]);
  expect(lintShadScheduleScale([schedule({ scale: 'days', days: '{{components.picker.value}}' })])).toEqual([]);
});
