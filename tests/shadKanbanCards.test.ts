import { expect, it } from 'vitest';
import { lintComponentSlots, lintShadKanbanCards } from '../src/lint.js';

const board = (cardLayout?: string) => ({ id: 'board', type: 'ShadKanban', properties: cardLayout ? { cardLayout } : {} });
const child = { id: 'title', type: 'Html', parent: 'board', layout: { left: 0, top: 0, width: 43, height: 40 } };

it('accepts slot_name body on a shadcn Kanban card canvas', () => {
  expect(lintComponentSlots([board('custom'), { ...child, slotName: 'body' }])).toEqual([]);
});

it('warns when card children sit on a board whose card content is still Fields', () => {
  const warnings = lintShadKanbanCards([board(), child]);
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toMatch(/cardLayout.*"custom"/);
  expect(lintShadKanbanCards([board('custom'), child])).toEqual([]);
});

it('warns when a custom-content board has no card children', () => {
  expect(lintShadKanbanCards([board('custom')])[0]).toMatch(/blank/);
  expect(lintShadKanbanCards([board()])).toEqual([]);
});
