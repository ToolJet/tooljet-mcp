// Names the ToolJet UI 2.0 widgets (Shad* types) used before their names were settled, and the name each one became.
// A copy of ToolJet's frontend/src/AppBuilder/Widgets/Shadcn/legacyNames.ts (the server keeps another for its data
// migration). Saved apps are rewritten by ToolJet; this copy lets lint name the replacement when an agent writes an
// old name (an event id, an action handle, an exposed value in a binding, a property key) from older docs or memory.
//
// An exposed value may map to a path ('lastCardMovement.card').

export type Ui2NameKind = 'events' | 'actions' | 'exposed' | 'properties';
export type Ui2Renames = Partial<Record<Ui2NameKind, Record<string, string>>>;

/** Applies to every UI 2.0 widget type: the older control actions. */
export const UI2_COMMON_RENAMES: Ui2Renames = {
  actions: { visibility: 'setVisibility', disable: 'setDisable', loading: 'setLoading' },
};

const CHART: Ui2Renames = { exposed: { clickedDatum: 'clickedDataPoint' } };
const PICKER: Ui2Renames = { events: { onChange: 'onSelect' }, actions: { clear: 'clearValue' } };

export const UI2_RENAMES: Record<string, Ui2Renames> = {
  ShadAreaChart: CHART,
  ShadBarChart: CHART,
  ShadComboChart: CHART,
  ShadFunnelChart: CHART,
  ShadHeatmapChart: CHART,
  ShadLineChart: CHART,
  ShadPieChart: CHART,
  ShadRadarChart: CHART,
  ShadRadialChart: CHART,
  ShadScatterChart: CHART,
  ShadBreadcrumb: { events: { onItemClick: 'onItemClicked' } },
  ShadButtonGroup: { exposed: { values: 'selected' } },
  ShadCalendar: { events: { onMonthChange: 'onMonthChanged' } },
  ShadCardGrid: { events: { onCardClick: 'onCardClicked' } },
  ShadCarousel: { events: { onSlideChange: 'onSlideChanged', onSlideClick: 'onSlideClicked' } },
  ShadCheckbox: { actions: { setChecked: 'setValue' } },
  ShadColorPicker: { exposed: { selectedColorHex: 'value', rgb: 'selectedColorRGB', rgba: 'selectedColorRGBA' } },
  ShadCombobox: { events: { onChange: 'onSelect' } },
  ShadDatePicker: {
    events: { onChange: 'onSelect' },
    actions: { setDate: 'setValue', clear: 'clearValue' },
    exposed: { selectedDate: 'value' },
  },
  ShadDateTimePicker: { ...PICKER, actions: { setDate: 'setValue', clear: 'clearValue' } },
  ShadEmpty: { events: { onAction: 'onActionClicked' } },
  ShadFileUpload: { actions: { clear: 'clearFiles' }, exposed: { files: 'file' } },
  ShadHero: { events: { onActionClick: 'onActionClicked', onSecondaryActionClick: 'onSecondaryActionClicked' } },
  ShadImage: { properties: { src: 'source', alt: 'alternativeText', fit: 'imageFit' } },
  ShadKanban: {
    events: { onCardClicked: 'onCardSelected' },
    actions: { updateCard: 'updateCardData' },
    exposed: {
      cards: 'updatedCardData',
      selectedCard: 'lastSelectedCard',
      lastMove: 'lastCardMovement',
      movedCard: 'lastCardMovement.card',
    },
  },
  ShadLink: { properties: { href: 'linkTarget', text: 'linkText', target: 'targetType' } },
  ShadListView: {
    events: { onRowClicked: 'onRecordClicked' },
    exposed: { selectedRow: 'selectedRecord', selectedRowId: 'selectedRecordId' },
  },
  ShadMap: {
    events: { onMapClick: 'onMapClicked', onShapeClick: 'onShapeClicked', onLocationPick: 'onLocationPicked' },
  },
  ShadMultiselect: { events: { onChange: 'onSelect' } },
  ShadNavigation: { events: { onSelect: 'onClick' }, actions: { setActive: 'selectItem' }, exposed: { activeItem: 'selectedItem' } },
  ShadPhoneInput: { actions: { setCountry: 'setCountryCode' } },
  ShadNumberInput: { actions: { setValue: 'setText' } },
  ShadProgressList: { events: { onItemClick: 'onItemClicked' } },
  ShadQuestionnaire: { events: { onStepChange: 'onStepChanged' } },
  ShadRadioGroup: { events: { onChange: 'onSelectionChange' } },
  ShadRecordList: {
    events: { onRowClicked: 'onItemClicked', onRecordClicked: 'onItemClicked' },
    exposed: {
      selectedRecord: 'selectedItem',
      selectedRow: 'selectedItem',
      selectedRecordId: 'selectedItemId',
      selectedRowId: 'selectedItemId',
    },
  },
  ShadSchedule: { events: { onBookingClick: 'onBookingClicked', onSlotClick: 'onSlotClicked' } },
  ShadSelect: { events: { onChange: 'onSelect' } },
  ShadSteps: { actions: { setDisabled: 'setDisable' }, properties: { schema: 'steps' } },
  ShadTable: { properties: { pageSize: 'rowsPerPage' } },
  ShadTags: { events: { onTagClick: 'onTagClicked' } },
  ShadTagsInput: {
    events: { onTagRemoved: 'onTagDeleted' },
    exposed: { tags: 'values', value: 'values', selectedTags: 'values' },
  },
  ShadTimePicker: { ...PICKER, actions: { setTime: 'setValue', clear: 'clearValue' } },
  ShadTimeline: { events: { onItemClick: 'onItemClicked' } },
  ShadToggleGroup: { exposed: { selected: 'value' } },
};

/** The current name a retired UI 2.0 name became, or undefined (not a UI 2.0 type, or not a retired name).
 *  Callers check the catalog first: a name that is still valid for the type is never reported as retired. */
export function retiredUi2Name(type: string | undefined, kind: Ui2NameKind, name: string): string | undefined {
  if (!type || !type.startsWith('Shad')) return undefined;
  const own = UI2_RENAMES[type]?.[kind];
  if (own && Object.prototype.hasOwnProperty.call(own, name)) return own[name];
  const common = UI2_COMMON_RENAMES[kind];
  return common && Object.prototype.hasOwnProperty.call(common, name) ? common[name] : undefined;
}
