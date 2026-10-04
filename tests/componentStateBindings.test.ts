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

// A claims build (2026-10-04) filtered its queue on components.type_filter?.label. A RadioButtonV2's label is the
// field's caption ("Type"), never the chosen option, so no claim matched and the queue showed none.
describe('a radio group read through its caption', () => {
  const radios = [{ id: 'r1', name: 'type_filter', type: 'RadioButtonV2' }];
  it.each([
    '{{components.type_filter.label}}',
    '{{ (queries.q.data || []).filter(r => !components.type_filter?.label || r.kind === components.type_filter?.label) }}',
  ])('is an error that names value: %s', (value) => {
    expect(lintComponentStateBindings(value, radios, 'Component "t"').join(' ')).toMatch(/type_filter.*caption.*components\.type_filter\.value/);
  });
  it('accepts value and options, and label on other components', () => {
    expect(lintComponentStateBindings('{{components.type_filter.value + components.type_filter.options.length}}', radios, 'x')).toEqual([]);
    expect(lintComponentStateBindings('{{components.other.label}}', [{ name: 'other', type: 'Button' }], 'x')).toEqual([]);
  });
});
