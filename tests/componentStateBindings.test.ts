import { describe, expect, it } from 'vitest';
import { lintComponentStateBindings } from '../src/componentStateBindings.js';
import { validateEvents } from '../src/eventValidation.js';
import type { AppSummary } from '../src/tooljetClient.js';

const components = [{ id: 'board', name: 'AtlasBoard', type: 'Kanban' }];
const summary: AppSummary = {
  app_id: 'test', pages: [{ id: 'home', name: 'Home', handle: 'home', components }],
  queries: [], events: [],
};

describe('known component runtime state aliases', () => {
  it.each([
    '{{components.AtlasBoard.selectedCard}}',
    '{{components?.AtlasBoard?.selectedCard?.id}}',
    '{{components["AtlasBoard"]["selectedCard"]}}',
    '{{components.AtlasBoard?.["selectedCard"] ?? null}}',
  ])('catches the observed Kanban alias: %s', (value) => {
    expect(lintComponentStateBindings(value, components, 'selection').join(' ')).toContain('lastSelectedCard');
  });

  it.each([
    '{{components.AtlasBoard.lastSelectedCard}}',
    '{{components[variables.boardName].selectedCard}}',
    '{{components.AtlasBoard[variables.fieldName]}}',
    '{{"components.AtlasBoard.selectedCard"}}',
    '{{/* components.AtlasBoard.selectedCard */ null}}',
    '{{((components) => components.AtlasBoard.selectedCard)({})}}',
    '{{(() => { const components = {}; return components.AtlasBoard.selectedCard; })()}}',
    'Example: components.AtlasBoard.selectedCard',
    '{{broken syntax',
  ])('does not reject valid, quoted, shadowed or unverifiable code: %s', (value) => {
    expect(lintComponentStateBindings(value, components, 'selection')).toEqual([]);
  });

  it('does not apply a Kanban contract to another or unknown component', () => {
    expect(lintComponentStateBindings('{{components.AtlasBoard.selectedCard}}',
      [{ name: 'AtlasBoard', type: 'CustomComponent' }], 'selection')).toEqual([]);
    expect(lintComponentStateBindings('{{components.missing.selectedCard}}', components, 'selection')).toEqual([]);
  });

  it('blocks the actual event before the wrong selection is persisted', () => {
    const event = {
      sourceType: 'component' as const, sourceId: 'board', trigger: 'onCardSelected',
      action: { actionId: 'set-custom-variable', key: 'selectedJob', value: '{{components.AtlasBoard.selectedCard}}' },
    };
    expect(validateEvents(summary, [event]).errors.join(' ')).toContain('does not expose selectedCard');
    event.action.value = '{{components.AtlasBoard.lastSelectedCard}}';
    expect(validateEvents(summary, [event]).errors).toEqual([]);
  });
});
