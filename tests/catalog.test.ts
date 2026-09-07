import { describe, it, expect } from 'vitest';
import { getCatalog, getComponentSchema } from '../src/catalog.js';
import { FORM_SCHEMA_FIELD_TYPES, SAFE_GENERATED_FORM_FIELD_TYPES } from '../src/formFieldTypes.js';

describe('catalog', () => {
  it('distinguishes inline Table edits from original selected-row values', () => {
    const hints = getComponentSchema('Table')!.authoringHints as any;
    expect(hints.inlineEditing.selection).toMatch(/selectedRow.*original.*not.*pending/i);
    expect(hints.inlineEditing.pendingRows).toContain('Object.values(components.<table>.dataUpdates || {})');
    expect(hints.inlineEditing.pendingRows).toMatch(/row indexes.*not.*database/i);
    expect(hints.inlineEditing.saveEvent).toContain('onBulkUpdate');
    expect(hints.inlineEditing.perRowSave).toMatch(/stable.*key/i);
    expect(hints.inlineEditing.validation).toMatch(/negative.*derived/i);
    expect(hints.rowActionButtons.eventRule).toMatch(/not pending inline edits/i);
  });
  it('distinguishes FilePicker base64 payloads from preview URLs', () => {
    const picker = getComponentSchema('FilePicker')!.authoringHints as any;
    expect(picker.filePayload).toMatch(/file\[0\]\.dataURL.*bare base64/);
    expect(picker.filePayload).toMatch(/base64Data.*same payload/);
    expect(picker.filePayload).toMatch(/name.*type/);
    expect(picker.preview).toMatch(/never bind bare base64 directly to href or src/i);
    expect(picker.preview).toContain('data:<validated MIME>;base64,<payload>');
    expect(picker.preview).toMatch(/top-level data-URL navigation.*blocked/);
  });
  it('explains numeric validation and PDF acceptance in on-demand authoring contracts', () => {
    const numeric = getComponentSchema('NumberInput')!.authoringHints as any;
    expect(numeric.validationPlacement).toMatch(/validation.minValue.*validation.maxValue/);
    expect(numeric.submitGuard).toMatch(/isValid.*negative/);
    const picker = getComponentSchema('FilePicker')!.authoringHints as any;
    expect(picker.acceptedTypes).toMatch(/validation.fileType.*image\/\*,application\/pdf/);
    expect(picker.acceptedTypes).toMatch(/enableValidation.*does not disable/);
    expect(picker.processing).toMatch(/not.*OCR.*PDF rasterization/);
  });

  it('documents native modal-close cleanup rather than Cancel-only selection reset', () => {
    const modal = getComponentSchema('ModalV2')!;
    const hints = modal.authoringHints as any;
    expect(modal.events?.map(event => event.id)).toContain('onClose');
    expect(hints.closeLifecycle.event).toBe('onClose');
    expect(hints.closeLifecycle.rule).toMatch(/not only on a Cancel button.*native X/);
    expect(hints.closeLifecycle.rule).toMatch(/deselect its row/);
    expect(hints.closeLifecycle.rule).toMatch(/never write or delete database records/);
    expect(hints.closeLifecycle.verification).toMatch(/reopen the same record and a different record/);
    expect(hints.nativeSlots.allowedValues).toEqual(['header', 'body', 'footer']);
  });
  it('palette lists the built-in components incl. Table and Statistics', () => {
    const types = getCatalog().map((c) => c.type);
    expect(types).toContain('Table');
    expect(types).toContain('Statistics');
    expect(types.length).toBeGreaterThanOrEqual(70);
    // every entry carries a purpose
    expect(getCatalog().every((c) => typeof c.type === 'string')).toBe(true);
  });

  it('includes source-harvested events, actions, exposed variables, and style metadata', () => {
    const table = getComponentSchema('Table')!;
    expect(table.events?.map((event) => event.id)).toEqual(
      expect.arrayContaining(['onPageChanged', 'onSearch', 'onSort', 'onFilterChanged', 'onBulkUpdate'])
    );
    expect(table.actions?.map((action) => action.handle)).toEqual(
      expect.arrayContaining(['setPage', 'selectRow', 'downloadTableData'])
    );
    expect(table.exposedVariables?.map((variable) => variable.name)).toEqual(
      expect.arrayContaining(['pageIndex', 'searchText', 'filters', 'currentPageData'])
    );
    expect(table.styles.some((style) => style.label && ('valueType' in style || 'default' in style))).toBe(true);

    const form = getComponentSchema('Form')!;
    expect(form.events?.map((event) => event.id)).toEqual(expect.arrayContaining(['onSubmit', 'onInvalid']));
    expect(form.actions?.map((action) => action.handle)).toEqual(expect.arrayContaining(['submitForm', 'resetForm']));
    expect(form.exposedVariables?.map((variable) => variable.name)).toContain('formData');
    expect(form.defaultChildren?.length).toBeGreaterThan(0);
  });

  it('recognizes persisted definition styles that ToolJet adds outside the inspector', () => {
    const expected = {
      Statistics: ['iconVisibility'],
      Text: ['verticalAlignment'],
      Chart: ['cssClass'],
      Table: ['maxRowHeightValue', 'contentWrap'],
    };
    for (const [type, keys] of Object.entries(expected)) {
      const styles = new Set(getComponentSchema(type)!.styles.map((style) => style.key));
      for (const key of keys) expect(styles.has(key), `${type}.${key}`).toBe(true);
    }
  });

  it('getComponentSchema returns full props for Table incl. the required binding props', () => {
    const t = getComponentSchema('Table');
    expect(t).toBeTruthy();
    const keys = t!.properties.map((p) => p.key);
    expect(keys).toContain('data');
    expect(keys).toContain('dataSourceSelector');
    expect(keys).toContain('autogenerateColumns');
    // dataSourceSelector's harvested default is the value that makes a Table render
    expect(t!.properties.find((p) => p.key === 'dataSourceSelector')?.default).toBe('rawJson');
  });

  it('returns null for an unknown component type', () => {
    expect(getComponentSchema('NotAComponent')).toBeNull();
  });

  it('hides every legacy component from new-authoring palette but keeps schemas for repairs', () => {
    const types = getCatalog().map((c) => c.type);
    const replacements = {
      ButtonGroup: 'ButtonGroupV2',
      Datepicker: 'DatePickerV2',
      DropDown: 'DropdownV2',
      KanbanBoard: 'Kanban',
      Modal: 'ModalV2',
      Multiselect: 'MultiselectV2',
      RadioButton: 'RadioButtonV2',
      RangeSlider: 'RangeSliderV2',
      ToggleSwitch: 'ToggleSwitchV2',
    };
    for (const [legacy, modern] of Object.entries(replacements)) {
      expect(types).not.toContain(legacy);
      expect(types).toContain(modern);
      expect(getComponentSchema(legacy)?.type).toBe(legacy);
    }
  });

  it('serves curated renderingHints for Chart and Statistics', () => {
    const chart = getComponentSchema('Chart');
    expect(chart!.renderingHints).toBeTruthy();
    expect(String(chart!.renderingHints!.recommendedWidthCols)).toMatch(/13.?15/);
    expect(String(chart!.renderingHints!.note)).toMatch(/title/i);
    const stat = getComponentSchema('Statistics');
    expect(String(stat!.renderingHints!.recommendedMinHeightPx)).toMatch(/110.?120/);
    expect(String(stat!.renderingHints!.narrowValueOnlyLabel)).toMatch(/12.?17.*one- or two-word.*hide the value/i);
    expect(String(stat!.renderingHints!.secondaryValueUsage)).toMatch(/narrow delta slot.*number or percentage/i);
    const modal = getComponentSchema('ModalV2');
    expect(modal!.renderingHints!.recommendedFieldAlignment).toBe('top');
    expect(String(modal!.renderingHints!.recommendedFieldRowStepPx)).toMatch(/authored field height \+ 30px.*70px only.*40px-authored/i);
    const tableCapacity = getComponentSchema('Table')!.renderingHints!.visibleRowCapacity as any;
    expect(tableCapacity).toMatchObject({ regularRowHeightPx: 46, condensedRowHeightPx: 40 });
    expect(tableCapacity.formula).toMatch(/rowsPerPage.*row height/i);
  });

  it('harvests static select values for component enum validation', () => {
    const table = getComponentSchema('Table')!;
    expect(table.styles.find((style) => style.key === 'tableType')?.allowedValues).toEqual([
      'table-classic', 'table-bordered', 'table-striped',
    ]);
    expect(table.styles.find((style) => style.key === 'cellSize')?.allowedValues).toEqual([
      'regular', 'condensed',
    ]);
  });

  it('does not advertise clientServerSwitch labels as persisted boolean enum values', () => {
    const table = getComponentSchema('Table')!;
    expect(table.properties.find((property) => property.key === 'serverSidePagination')).toMatchObject({
      valueType: 'boolean',
      default: '{{false}}',
    });
    expect(table.properties.find((property) => property.key === 'serverSidePagination')).not.toHaveProperty(
      'allowedValues'
    );
  });

  it('serves the source-verified Table row-action Button-column contract', () => {
    const table = getComponentSchema('Table')!;
    const rowActions = table.authoringHints!.rowActionButtons as any;
    expect(rowActions.catalogActionsMeaning).toMatch(/runtime methods.*not row-action buttons/i);
    expect(rowActions.recommendedApproach).toMatch(/columnType="button".*deprecated/i);
    expect(rowActions.columnExample).toMatchObject({
      key: 'actions',
      columnType: 'button',
      autogenerated: false,
      buttons: [
        expect.objectContaining({
          id: 'view-action',
          buttonLabel: 'View',
          buttonType: 'solid',
          buttonVisibility: true,
        }),
      ],
    });
    expect(rowActions.eventExample).toMatchObject({
      source_type: 'table_column',
      ref: 'actions::view-action',
      trigger: 'onClick',
    });
  });

  it('keeps selective DropdownV2 schema lookups complete and exposes its runtime selection', () => {
    const dropdown = getComponentSchema('DropdownV2')!;
    const schema = dropdown.properties.find((property) => property.key === 'schema');
    const options = dropdown.properties.find((property) => property.key === 'options');
    expect(schema).toMatchObject({
      requires: { advanced: '{{true}}' },
      mutuallyExclusiveWith: ['options'],
    });
    expect(String(schema?.default)).not.toContain('…');
    expect(options).toMatchObject({
      requires: { advanced: '{{false}}' },
      mutuallyExclusiveWith: ['schema'],
    });
    expect(dropdown.exposedVariables?.map((variable) => variable.name)).toEqual(
      expect.arrayContaining(['value', 'selectedOption', 'options'])
    );
    expect((dropdown.authoringHints?.optionModes as any).rule).toMatch(/schema only when advanced=true/i);
  });

  it('keeps modal fields compact without losing the rendered-height rule', () => {
    const modalHints = getComponentSchema('ModalV2')!.renderingHints as any;
    expect(modalHints).toMatchObject({
      recommendedSingleLineFieldHeightPx: 40,
      topAlignedRenderedFootprintPx: 60,
      recommendedTextAreaHeightPx: '90–100',
    });
    expect(modalHints.recommendedFieldRowStepPx).toMatch(/authored field height \+ 30px.*20px.*10px gap.*70px only.*40px-authored/i);

    const inputHints = getComponentSchema('TextInput')!.renderingHints as any;
    expect(inputHints.compactFormHeight).toMatch(/defaultSize\.height.*40px.*60px.*70px/i);
    expect(inputHints.valueTextSizing).toMatch(/does not enlarge.*value text.*labelFontSize/i);
  });

  it('preserves exact nested Calendar and Timeline property contracts', () => {
    const calendarEvents = getComponentSchema('Calendar')!.properties.find((property) => property.key === 'events')!;
    const timelineData = getComponentSchema('Timeline')!.properties.find((property) => property.key === 'data')!;

    expect(String(calendarEvents.default)).not.toContain('…');
    expect(String(calendarEvents.default)).toMatch(/title.*start.*end.*allDay/s);
    expect(String(timelineData.default)).not.toContain('…');
    expect(String(timelineData.default)).toMatch(/title.*subTitle.*date.*iconBackgroundColor/s);
  });

  it('distinguishes Calendar event projections from source records and shares date parsing contracts', () => {
    const calendar = getComponentSchema('Calendar')!;
    expect(calendar.description).toMatch(/selectedEvent is the projected event, not the source row/);
    const selected = calendar.exposedVariables!.find(variable => variable.name === 'selectedEvent') as any;
    expect(selected.semantics).toMatch(/NOT automatically the original query row/);
    expect(selected.semantics).toMatch(/start\/end become JavaScript Date objects/);
    expect(selected.semantics).toMatch(/look up the original row by selectedEvent.id/);
    for (const key of ['dateFormat', 'events', 'defaultDate', 'startTime', 'endTime']) {
      const property = calendar.properties.find(property => property.key === key) as any;
      expect(property.description).toMatch(/raw ISO query timestamps do not match the default/);
    }
  });

  it('serves the KeyValuePair projection contract', () => {
    const hints = getComponentSchema('KeyValuePair')!.authoringHints!.dataProjection as any;
    expect(hints.rule).toMatch(/explicit fields.*does not suppress undeclared keys.*new object/i);
    expect(hints.safeExample).toMatch(/work_order.*client.*status/);
    expect(hints.updateRule).toMatch(/object spreads are not safe/i);
    expect(hints.defaultFieldRule).toMatch(/MCP populates fieldDeletionHistory.*appended.*positionally merged/i);
  });

  it('serves exact server-side Table state shapes and control timing caveats', () => {
    const table = getComponentSchema('Table')!;
    const variables = new Map(table.exposedVariables!.map((variable) => [variable.name, variable as any]));
    expect(variables.get('pageIndex')).toMatchObject({ valueType: 'number', semantics: expect.stringMatching(/1-based/) });
    expect(variables.get('sortApplied').itemShape).toEqual({
      column: 'display column name', columnKey: 'data key', direction: 'asc | desc',
    });
    expect(variables.get('filters').itemShape).toEqual({
      column: 'data key', condition: 'Table filter condition', value: 'filter value',
    });
    expect((table.authoringHints!.serverSideDataFlow as any).reactiveReadRule)
      .toMatch(/runOnDependencyChange=true.*after.*state is published/i);
    expect((table.authoringHints!.serverSideDataFlow as any).initialPageGuard)
      .toMatch(/pageIndex can be undefined.*pageIndex \|\| 1.*NaN.*empty table/i);

    expect((getComponentSchema('ButtonGroupV2')!.authoringHints!.selectionTiming as any).rule)
      .toMatch(/onClick.*before.*new selected value.*page query and count query.*disagree/i);
    expect((getComponentSchema('DaterangePicker')!.authoringHints!.emptyDatasourceBinding as any).rule)
      .toMatch(/literal strings "undefined" or "Invalid date"/i);
  });

  it('serves the Kanban interaction dependency and custom-card modal caveat', () => {
    const rule = getComponentSchema('Kanban')!.authoringHints!.cardContent as any;
    expect(rule.interactionRule.selectionDependency).toMatch(/onCardSelected.*only when openModalOnCardClick.*true/i);
    expect(rule.interactionRule.customHtmlModal).toMatch(/custom Html.*built-in card modal.*blank/i);
  });

  it('describes the runtime movement payload rather than moveCard action arguments', () => {
    const movement = getComponentSchema('Kanban')!.exposedVariables!
      .find(variable => variable.name === 'lastCardMovement') as any;
    // Payload emitted by KanbanBoard.jsx onDragEnd/moveCard; the action's cardId
    // parameter is NOT a member of the exposed movement object.
    const emitted = {
      originColumnId: 'Brief', destinationColumnId: 'Client review', originCardIndex: 0,
      destinationIndex: 0, cardDetails: { id: 'p-026', columnId: 'Client review', title: 'Test' },
    };
    expect(Object.keys(movement.shape).sort()).toEqual(Object.keys(emitted).sort());
    expect(movement.shape.cardDetails.id).toBe('moved card id');
    expect(movement.shape).not.toHaveProperty('cardId');
    expect(movement.shape).not.toHaveProperty('destinationColumn');
  });

  it('exposes Map marker identity and the deployment provider dependency', () => {
    const map = getComponentSchema('Map')!;
    const variables = new Map(map.exposedVariables!.map(variable => [variable.name, variable as any]));
    expect(map.events!.map(event => event.id)).toContain('onMarkerClick');
    expect(variables.get('selectedMarker').semantics).toMatch(/original marker object.*before onMarkerClick.*stable record id/i);
    expect(variables.get('selectedMarker').semantics).toMatch(/Guard a missing or empty selection/);
    expect(variables.get('markers').valueType).toBe('array');
    expect(variables.get('bounds').shape.northEast).toEqual({ lat: 'number', lng: 'number' });
    expect(map.description).toMatch(/deployment Google Maps API configuration/);
    expect(map.authoringHints!.providerSetup).toMatch(/GOOGLE_MAPS_API_KEY.*do not invent/i);
    expect(map.authoringHints!.markerSelection).toMatch(/Do not match solely by coordinates/);
  });

  it('distinguishes date-only DatePicker output from its offset timestamp', () => {
    const variables = new Map(getComponentSchema('DatePickerV2')!.exposedVariables!
      .map(variable => [variable.name, variable as any]));
    expect(variables.get('value').semantics).toMatch(/ISO timestamp with a timezone offset/);
    expect(variables.get('selectedDate').semantics).toMatch(/dateFormat="YYYY-MM-DD".*selectedDate/);
    expect(variables.get('displayValue').semantics).toMatch(/same formatting as selectedDate/);
    expect(variables.has('unixTimestamp')).toBe(true);
  });

  it('serves Listview grid, repeated-child, and selection semantics', () => {
    const listview = getComponentSchema('Listview')!;
    expect(listview.exposedVariables?.map((variable) => variable.name)).toEqual(
      expect.arrayContaining(['selectedRecord', 'selectedRecordId', 'selectedRow', 'selectedRowId'])
    );
    const hints = listview.authoringHints as any;
    expect(hints.modes.gridViewRule).toMatch(/no separate GridView.*type:"Listview".*mode:"grid"/i);
    expect(hints.repeatedChildren.atomicBatchRule).toMatch(/same add_components call.*client_ref\/parent_ref.*empty exposed values/i);
    expect(hints.repeatedChildren.localCanvasRule).toMatch(/fresh 43-column local canvas.*left:0,width:43.*do not divide/i);
    expect(hints.repeatedChildren.htmlSizingRule).toMatch(/height:100%.*box-sizing:border-box.*scrollbar/i);
    expect(hints.selection.selectedRecordShape).toMatch(/keyed by repeated child component name.*not the original listItem/i);
    expect(hints.selection.paginationCaveat).toMatch(/page-local.*not.*durable record ids/i);
  });

  it('serves the authoritative generated-Form field contract and FilePicker workaround', () => {
    const form = getComponentSchema('Form')!;
    const hints = form.authoringHints!.jsonSchemaFields as any;
    expect(hints.supportedTypes).toEqual(FORM_SCHEMA_FIELD_TYPES);
    expect(hints.safeGeneratedTypes).toEqual(SAFE_GENERATED_FORM_FIELD_TYPES);
    expect(hints.decisionRule).toMatch(/only when every field.*safeGeneratedTypes.*entire form.*standalone/i);
    expect(hints.selectContract).toMatch(/values.*displayValues.*not options/i);
    expect(hints.validationContract).toMatch(/no required flag.*minLength.*customRule/i);
    expect(hints.unsafeTypes.filepicker).toMatch(/crashes the entire Form.*standalone FilePicker/i);
    expect(hints.emptyDateValue).toBe('{{null}}');
    expect(hints.hardLayoutLimit).toMatch(/does not pass alignment.*TextArea.*literal "Label".*single-line/i);
    expect(hints.standaloneReplacement).toMatchObject({
      alignment: { path: 'styles.alignment.value', value: 'top' },
      requiredValidationPath: 'validation.mandatory',
      valuePath: 'components.<field>.value',
      fileValuePath: 'components.<picker>.file[0]',
    });
  });
});
