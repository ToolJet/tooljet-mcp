import { describe, expect, it } from 'vitest';
import { lintComponentStateBindings, lintEmptyDateWrites } from '../src/componentStateBindings.js';
import { validateEvents } from '../src/eventValidation.js';
import { validateAppStructure } from '../src/lint.js';
import { getComponentSchema } from '../src/catalog.js';
import type { AppSummary } from '../src/tooljetClient.js';

const components = [{ id: 'board', name: 'AtlasBoard', type: 'Kanban' }];
const summary: AppSummary = {
  app_id: 'test', pages: [{ id: 'home', name: 'Home', handle: 'home', components }],
  queries: [], events: [],
};

describe('ReorderableList ordered values contract', () => {
  const lists = [{ id: 'order', name: 'issueOrder', type: 'ReorderableList' }];
  const aliasErrors = (errors: string[]) => errors.filter(error => error.includes('does not expose value.'));

  it('catalogs the source-verified plural runtime field, not the nonexistent singular alias', () => {
    const variables = getComponentSchema('ReorderableList')!.exposedVariables!;
    expect(variables.filter(variable => variable.name === 'values')).toEqual([{
      name: 'values', valueType: 'array',
      semantics: expect.stringMatching(/Ordered option values.*initialized on mount.*before onChange.*nonexistent \.value alias/),
    }]);
    expect(variables.map(variable => variable.name)).not.toContain('value');
    expect(variables.map(variable => variable.name)).toContain('options');
  });

  it.each([
    '{{ components.issueOrder.value }}',
    '{{ components.issueOrder?.value }}',
    '{{ components?.issueOrder?.value?.map(id => id) }}',
    '{{ components["issueOrder"]["value"] }}',
    '{{ components?.["issueOrder"]?.["value"] ?? [] }}',
    '{{ (components.issueOrder.value || []).map(id => id) }}',
  ])('rejects the proven alias even when guarded: %s', (value) => {
    const errors = lintComponentStateBindings(value, lists, 'selection');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('selection: ReorderableList "issueOrder" does not expose value.');
    expect(errors[0]).toContain('components.issueOrder.values');
  });

  it('blocks both final editorial query fields through app validation without changing the input', () => {
    // Field expressions from a real editorial app build,
    // reduced to portable query options; no traces, database or live app needed.
    const app: AppSummary = {
      app_id: 'test', pages: [{ id: 'assembly', components: lists }], events: [],
      queries: [
        { id: 'stories', name: 'stories' },
        { id: 'saveOrder', name: 'saveOrder', options: {
          operation: 'update_rows', update_rows: { columns: { '0': {
            column: 'story_ids', value: '{{ components.issueOrder?.value }}',
          } } },
        } },
        { id: 'savePreview', name: 'savePreview', options: {
          operation: 'create_row', create_row: { '1': { column: 'snapshot',
            value: '{{ components.issueOrder?.value.map(id => { const s = queries.stories.data.find(r => r.id === id); return { title: s.title, section: s.section, tags: s.tags }; }) }}',
          } },
        } },
      ],
    };
    const before = JSON.stringify(app);
    const errors = aliasErrors(validateAppStructure(app).errors);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('Query "saveOrder".update_rows.columns.0.value:');
    expect(errors[1]).toContain('Query "savePreview".create_row.1.value:');
    expect(JSON.stringify(app)).toBe(before);
    const corrected = JSON.parse(before.replaceAll('issueOrder?.value', 'issueOrder?.values')) as AppSummary;
    expect(aliasErrors(validateAppStructure(corrected).errors)).toEqual([]);
  });

  it('rejects raw RunJS query code and event action bindings via existing entry points', () => {
    expect(lintComponentStateBindings({ code: 'return components.issueOrder?.value ?? [];'}, lists, 'Query "save"'))
      .toEqual([expect.stringContaining('Query "save".code: ReorderableList "issueOrder" does not expose value.')]);
    const app: AppSummary = { app_id: 'test', pages: [{ id: 'assembly', components: lists }], queries: [], events: [] };
    const event = {
      sourceType: 'component' as const, sourceId: 'order', trigger: 'onChange',
      action: { actionId: 'set-custom-variable', key: 'storyIds', value: '{{components.issueOrder.value}}' },
    };
    expect(aliasErrors(validateEvents(app, [event]).errors)).toHaveLength(1);
    event.action.value = '{{components.issueOrder.values}}';
    expect(validateEvents(app, [event]).errors).toEqual([]);
  });

  it.each([
    '{{ components.issueOrder.values }}',
    '{{ components.issueOrder?.["values"] ?? [] }}',
    '{{ components.issueOrder.options.map(option => option.value) }}',
    '{{ components.issueOrder.options[0].value }}',
    '{{ components.issueOrder.values[0].value }}',
    '{{ queries.stories.data[0].value }}',
    '{{ components.issueOrder.futureRuntimeField }}',
    '{{ components[variables.name].value }}',
    '{{ components.issueOrder[variables.field] }}',
    '{{ "components.issueOrder.value" }}',
    '{{ /* components.issueOrder.value */ [] }}',
    '{{ ((components) => components.issueOrder.value)({}) }}',
    '{{ (() => { const components = {}; return components.issueOrder.value; })() }}',
    '{{ (({ components }) => components.issueOrder.value)({}) }}',
    'Example: components.issueOrder.value',
    '{{ broken syntax',
  ])('preserves valid, nested, shadowed or unverifiable reads: %s', (value) => {
    expect(lintComponentStateBindings(value, lists, 'selection')).toEqual([]);
  });

  it.each(['TextInput', 'RichTextEditor', 'RadioButtonV2', 'DropdownV2', 'DatePickerV2', 'CustomComponent', undefined])(
    'does not apply this alias contract to type %s', (type) => {
      expect(lintComponentStateBindings('{{components.issueOrder.value}}', [{ name: 'issueOrder', type }], 'x')).toEqual([]);
    },
  );
  it('leaves unknown components and shadowed RunJS code unverified', () => {
    expect(lintComponentStateBindings('{{components.missing.value}}', lists, 'x')).toEqual([]);
    expect(lintComponentStateBindings({ code: 'const components = {}; return components.issueOrder.value;' }, lists, 'q')).toEqual([]);
    expect(lintComponentStateBindings({ code: 'return components.issueOrder.values.map(value => value);' }, lists, 'q')).toEqual([]);
  });
});

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

// Insurance claims (round 3 pass 6, 2026-10-04): the same radio-label mistake in a RunJS query's code emptied the claims
// queue; the rule read {{ }} bindings only.
describe('a RunJS query reading a known wrong alias', () => {
  const radios = [{ name: 'typeFilter', type: 'RadioButtonV2' }];
  it('is caught in the query code', () => {
    const options = { code: 'const rows = queries.claims.data || [];\nconst type = components.typeFilter?.label || "All";\nreturn rows.filter(r => type === "All" || r.claim_type === type);' };
    expect(lintComponentStateBindings(options, radios, 'Query "queueFiltered"').join(' ')).toMatch(/typeFilter.*caption.*value/);
  });
  it('leaves correct, shadowed and unparsable code alone', () => {
    expect(lintComponentStateBindings({ code: 'return components.typeFilter.value;' }, radios, 'q')).toEqual([]);
    expect(lintComponentStateBindings({ code: 'const components = {}; return components.typeFilter.label;' }, radios, 'q')).toEqual([]);
    expect(lintComponentStateBindings({ code: 'return (' }, radios, 'q')).toEqual([]);
    expect(lintComponentStateBindings({ note: 'components.typeFilter.label' }, radios, 'q')).toEqual([]);
  });
});

// A UI 2.0 widget publishes exactly its catalogued values and actions, so any other name reads undefined. Luna builds
// (2026-10-18): an intake form's submit check read consent.checked and could never pass; a job count read a record
// list's data property and always showed 0.
describe('a UI 2.0 widget read through a name it does not publish', () => {
  const ui2 = [
    { id: 'c', name: 'consent', type: 'ShadCheckbox' },
    { id: 'g', name: 'courseCards', type: 'ShadCardGrid' },
    { id: 'r', name: 'dispatchList', type: 'ShadRecordList' },
    { id: 'n', name: 'nativeBox', type: 'Checkbox' },
  ];

  it('rejects the unpublished name and names what the widget publishes', () => {
    const [error, ...rest] = lintComponentStateBindings('{{ components.consent?.checked && true }}', ui2, 'submit');
    expect(rest).toEqual([]);
    expect(error).toContain('submit: ShadCheckbox "consent" has no checked');
    expect(error).toContain('components.consent.value');
  });

  it.each([
    ['{{ components.courseCards?.selectedCard }}', 'components.courseCards.selectedItem'],
    ['{{ (components.dispatchList.data || []).length }}', 'selectedItem'],
  ])('rejects %s', (value, hint) => {
    const errors = lintComponentStateBindings(value, ui2, 'p');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(hint);
  });

  it('accepts published values, actions and the id every component has', () => {
    for (const value of [
      '{{ components.consent.value }}',
      '{{ components.consent.isValid && components.consent.label }}',
      '{{ components.consent.id }}',
      '{{ components.courseCards.selectedItem.title }}',
    ]) expect(lintComponentStateBindings(value, ui2, 'p')).toEqual([]);
    expect(lintComponentStateBindings({ code: 'await components.consent.setValue(true);' }, ui2, 'q')).toEqual([]);
  });

  it('leaves native widgets alone: their catalog is not a complete list of what they publish', () => {
    expect(lintComponentStateBindings('{{ components.nativeBox.checked }}', ui2, 'p')).toEqual([]);
  });
});

// An empty date or time picker publishes '' and a date or timestamp column rejects it, so the whole save failed
// whenever an optional date was left blank (intake form rebuild, 2026-10-18).
describe('a ToolJet DB write of a date picker that may be empty', () => {
  const comps = [
    { id: 'd', name: 'incident_date', type: 'ShadDatePicker' },
    { id: 't', name: 'consultation', type: 'ShadDateTimePicker' },
    { id: 'n', name: 'nativeDate', type: 'DatePickerV2' },
    { id: 'i', name: 'full_name', type: 'ShadInput' },
  ];
  const write = (value: string) => ({ operation: 'create_row', create_row: { '0': { column: 'incident_date', value } } });

  it.each(['{{ components.incident_date?.value }}', '{{components.consultation.value}}', '{{ components.nativeDate.value }}'])(
    'asks for a null fallback: %s', (value) => {
      const errors = lintEmptyDateWrites(write(value), comps, 'Query "submit"');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatch(/Query "submit"\.create_row\.0\.value: .* '' .*\|\| null/);
    });

  it('checks update_rows columns too', () => {
    const options = { operation: 'update_rows', update_rows: { columns: { '0': { column: 'when', value: '{{ components.incident_date.value }}' } } } };
    expect(lintEmptyDateWrites(options, comps, 'Query "save"')).toHaveLength(1);
  });

  it.each([
    '{{ components.incident_date?.value || null }}',
    '{{ components.incident_date.value ? components.incident_date.value : null }}',
    '{{ components.full_name.value }}',
    '{{ components.incident_date.selectedDate }}',
  ])('accepts %s', (value) => {
    expect(lintEmptyDateWrites(write(value), comps, 'Query "submit"')).toEqual([]);
  });

  it('ignores the same binding outside a ToolJet DB write', () => {
    expect(lintEmptyDateWrites({ list_rows: { '0': { value: '{{ components.incident_date.value }}' } } }, comps, 'Query "q"')).toEqual([]);
  });
});

// A UI 2.0 value with a documented shape: a member it does not have reads undefined. A staging build (2026-10-18) saved
// a board move with lastCardMovement.toColumn, which would have written an empty status and dropped the card from
// every column.
describe('a member a UI 2.0 value does not have', () => {
  const comps = [{ id: 'b', name: 'board', type: 'ShadKanban' }, { id: 'k', name: 'nativeBoard', type: 'Kanban' }];

  it('catalogs the UI 2.0 move with its members, the native names included', () => {
    const movement = getComponentSchema('ShadKanban')!.exposedVariables!.find((variable) => variable.name === 'lastCardMovement')!;
    expect(Object.keys((movement as { shape: Record<string, unknown> }).shape)).toEqual(
      expect.arrayContaining(['cardId', 'card', 'from', 'to', 'toIndex', 'cardDetails', 'destinationColumnId', 'originColumnId']),
    );
  });

  it('rejects an invented member and names the real ones', () => {
    const errors = lintComponentStateBindings('{{ components.board.lastCardMovement.toColumn }}', comps, 'Query "move".value');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('ShadKanban "board" lastCardMovement has no toColumn');
    expect(errors[0]).toContain('to');
  });

  it.each([
    '{{ components.board.lastCardMovement.to }}',
    '{{ components.board?.lastCardMovement?.cardId }}',
    '{{ components.board.lastCardMovement.destinationColumnId }}',
    '{{ components.board.lastCardMovement.cardDetails.id }}',
    '{{ components.board.lastCardMovement.card.status }}',
    '{{ components.nativeBoard.lastCardMovement.whatever }}',
  ])('accepts %s', (value) => {
    expect(lintComponentStateBindings(value, comps, 'p')).toEqual([]);
  });
});

// A board's onCardMoved save must read the move, not the card last clicked: a staging build (2026-10-18) saved a drag
// with lastSelectedCard.status and lastSelectedCard.id, which writes nothing, or the clicked card's old status to it.
describe('a board move saved from the card last clicked', () => {
  const app = (value: string, trigger = 'onCardMoved'): AppSummary => ({
    app_id: 'test', pages: [{ id: 'home', components: [{ id: 'b1', name: 'board', type: 'ShadKanban' }] }],
    queries: [{ id: 'q1', name: 'move_ticket', options: { operation: 'update_rows', update_rows: {
      columns: { '0': { column: 'status', value } },
      where_filters: { '0': { column: 'id', operator: 'eq', value: '{{ components.board?.lastSelectedCard.id }}' } },
    } } }],
    events: [{ id: 'e1', name: 'save move', sourceId: 'b1', target: 'component',
      event: { eventId: trigger, actionId: 'run-query', queryId: 'q1', queryName: 'move_ticket' } }],
  });
  const moveErrors = (summary: AppSummary) =>
    validateAppStructure(summary).errors.filter((error) => error.includes('lastSelectedCard'));

  it('refuses it and names the move', () => {
    const errors = moveErrors(app('{{ components.board?.lastSelectedCard.status }}'));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Query "move_ticket" runs on board onCardMoved');
    expect(errors[0]).toContain('components.board.lastCardMovement.cardId');
  });

  it('leaves a save on onCardSelected alone', () => {
    expect(moveErrors(app('{{ components.board?.lastSelectedCard.status }}', 'onCardSelected'))).toEqual([]);
  });
});
