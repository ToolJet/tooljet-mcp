import { getComponentSchema } from './catalog.js';
import { STYLE_KEYS_IN_PROPERTIES, PROPERTY_KEY_ALIASES, isMisplacedStyleKey, nearestCatalogKey } from './lint.js';
import type { ComponentSpec } from './tooljetClient.js';
import { separateAdjacentClosingBracesDeep } from './bindingBraces.js';

export interface ComponentNormalization<T extends ComponentSpec = ComponentSpec> {
  component: T;
  patch: {
    properties?: Record<string, unknown>;
    styles?: Record<string, unknown>;
    validation?: Record<string, unknown>;
    others?: Record<string, unknown>;
  };
  warnings: string[];
}

type DefinitionSection = 'properties' | 'styles' | 'validation' | 'others';

function normalizeSection(
  section: Record<string, unknown> | undefined
): { value: Record<string, unknown> | undefined; patch: Record<string, unknown> | undefined } {
  if (!section) return { value: undefined, patch: undefined };
  const value: Record<string, unknown> = {};
  const patch: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(section)) {
    const canonical = entry !== null && typeof entry === 'object' && !Array.isArray(entry) && 'value' in entry
      ? entry
      : { value: entry };
    value[key] = canonical;
    if (canonical !== entry) patch[key] = canonical;
  }
  return {
    value,
    patch: Object.keys(patch).length ? patch : undefined,
  };
}

function propValue(properties: Record<string, unknown>, key: string): unknown {
  const entry = properties[key] as { value?: unknown } | undefined;
  return entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
}

function isTruthy(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value !== 'string') return false;
  const compact = value.replace(/\s+/g, '').toLowerCase();
  return compact === 'true' || compact === '{{true}}' || compact === '1' || compact === '{{1}}';
}

function catalogDefault(type: string, key: string, fallback: unknown): unknown {
  return getComponentSchema(type)?.properties.find((property) => property.key === key)?.default ?? fallback;
}

// Table column names that hold money, and ones that hold a state (a shadcn-look table finishes both).
const MONEY_WORDS = /\b(price|amount|cost|total|revenue|balance|fee|fees|spend|spent|salary|budget|paid|payment|invoice|subtotal|tax|refund|value|mrr|arr)\b/i;
const PERSON_WORDS = /\b(customer|client|requester|requestor|owner|assignee|assigned to|contact|lead|member|patient|guest|organi[sz]er|employee|technician|tech|agent|rep|student|author|reporter|host|driver|candidate|applicant|tenant|buyer|seller|manager|person|attendee|trainer|coach|instructor|doctor|vet|veterinarian|nurse|resident|full name|customer name|contact name)\b/i;
// A total of minutes, reps or items is a count, not money ("Total (min)" read "47.00").
const UNIT_WORDS = /\b(min|mins|minutes?|hours?|hrs?|days?|weeks?|time|count|qty|quantity|servings?|units?|items?|points?|score|percent|pct|kg|lbs?|reps?|sets?|seats?|guests?|nights?|orders?|tickets?|visits?)\b/i;
// Counts a KPI label can name besides money; periods ("this week") are not among them.
const COUNT_WORDS = /\b(min|mins|minutes?|hours?|hrs?|count|qty|quantity|servings?|units?|items?|points?|score|percent|pct|kg|lbs?|reps?|sets?|seats?|guests?|nights?|orders?|tickets?|visits?|jobs?|rate)\b/i;
const STATE_WORDS = /\b(status|stage|state|priority|severity|availability|health|risk|condition)\b/i;

const CLIENT_SERVER_BOOLEAN_KEYS = new Set([
  'serverSidePagination',
  'serverSideSearch',
  'serverSideSort',
  'serverSideFilter',
]);

// A value-only Statistics tile with an icon clips its number below this width. Grouped/currency
// values ("$129,426.00") clip even around 19–20 columns, so the safe floor sits above half the
// 43-column canvas rather than at the old 18 (a width-19 currency tile was rendering clipped).
const STATISTICS_ICON_VALUE_MIN_SAFE_WIDTH_COLS = 24;

/** True unknown keys ToolJet silently ignores — not a catalog key, a misplaced style key, a known
 *  alias, or a close typo (those are left for the linter to rename/error, never silently stripped). */
function isStrippableUnknownKey(
  type: string,
  section: 'properties' | 'styles',
  key: string,
  knownKeys: string[]
): boolean {
  if (knownKeys.includes(key)) return false;
  // These are not harmless cruft: stripping an attempted edit preselection
  // silently opens a blank selector and can erase a foreign key on Save.
  if (type === 'DropdownV2' && section === 'properties' && ['value', 'defaultValue'].includes(key)) return false;
  if (section === 'properties' && STYLE_KEYS_IN_PROPERTIES.has(key)) return false;
  const aliasTarget = PROPERTY_KEY_ALIASES[key.toLowerCase()];
  if (aliasTarget && (knownKeys.includes(aliasTarget) || STYLE_KEYS_IN_PROPERTIES.has(aliasTarget))) return false;
  if (nearestCatalogKey(key, knownKeys)) return false;
  return true;
}

/** Apply small persisted-definition compatibility fixes without changing component intent.
 *  With `stripUnknownKeys` (new-component writes only — add_components / planned apply), unknown keys
 *  ToolJet would silently ignore are removed from the saved definition instead of persisted as cruft
 *  (e.g. dynamicHeight, collapseWhenHidden). Legacy in-place update paths do NOT pass this. */
export function normalizeComponentSpec<T extends ComponentSpec>(
  component: T,
  options: { stripUnknownKeys?: boolean } = {}
): ComponentNormalization<T> {
  const normalizedSections = Object.fromEntries(
    (['properties', 'styles', 'validation', 'others'] as DefinitionSection[]).map((section) => [
      section,
      normalizeSection(component[section]),
    ])
  ) as Record<DefinitionSection, ReturnType<typeof normalizeSection>>;
  const properties = { ...(normalizedSections.properties.value ?? {}) };
  const propertyPatch: Record<string, unknown> = {};
  const stylePatch: Record<string, unknown> = {};
  const warnings: string[] = [];
  const setProperty = (key: string, value: unknown): void => {
    const current = properties[key];
    const wrapped = current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>), value }
      : { value };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
  };

  // Auto-fix deterministic mechanical mistakes so they don't each cost a lint iteration:
  //  (a) a known alias (fontsize, bgcolor, color, …) → its correct ToolJet key;
  //  (b) a style key placed under `properties` → moved to `styles` (ToolJet reads style keys from
  //      `styles` and silently drops them from `properties`).
  const stylesValue: Record<string, unknown> = normalizedSections.styles.value ?? {};
  let stylesChanged = false;
  // Write a value under `styles` (ToolJet reads size/colour keys from styles, not properties).
  const setStyle = (key: string, value: unknown): void => {
    const current = stylesValue[key];
    stylesValue[key] = current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>), value }
      : { value };
    stylePatch[key] = stylesValue[key];
    normalizedSections.styles.value = stylesValue;
  };
  // Aliases are scoped to the component's real schema: a key that IS a property of this type is never
  // an alias (ModalV2 `size` = modal width sm/md/lg/xl, not textSize), and an alias only fires when its
  // target exists on this type (Divider has no textColor for `color` to become). Otherwise the rewrite
  // itself creates the unknown key the linter then warns about. Types missing from the catalog keep the
  // unscoped behaviour.
  const schema = getComponentSchema(component.type);
  const knownPropertyKeys = schema ? new Set(schema.properties.map((entry) => entry.key)) : undefined;
  const knownStyleKeys = schema ? new Set(schema.styles.map((entry) => entry.key)) : undefined;
  const aliasTargetFor = (key: string): string | undefined => {
    if (knownPropertyKeys?.has(key)) return undefined;
    const target = PROPERTY_KEY_ALIASES[key.toLowerCase()];
    if (!target) return undefined;
    if (!schema) return target;
    return knownStyleKeys!.has(target) || knownPropertyKeys!.has(target) ? target : undefined;
  };
  for (const key of Object.keys(properties)) {
    const aliasTarget = aliasTargetFor(key);
    const canonical = aliasTarget ?? key;
    const belongsInStyles = canonical !== 'styles' && (isMisplacedStyleKey(component.type, canonical) ||
      (!!aliasTarget && !!knownStyleKeys?.has(canonical) && !knownPropertyKeys?.has(canonical)));
    if (!aliasTarget && !belongsInStyles) continue;
    if (belongsInStyles) {
      if (stylesValue[canonical] === undefined) stylesValue[canonical] = properties[key];
      delete properties[key];
      stylesChanged = true;
      warnings.push(
        `${component.type} "${component.name}": moved ${aliasTarget ? `alias "${key}"` : `style key "${key}"`} ` +
          `to styles.${canonical} (ToolJet reads it from styles, not properties).`
      );
    } else if (canonical !== key) {
      if (properties[canonical] === undefined) properties[canonical] = properties[key];
      delete properties[key];
      warnings.push(`${component.type} "${component.name}": renamed alias "${key}" to "${canonical}".`);
    }
  }
  // The reverse: a key this type declares only as a property, authored under styles (FlexContainer padding,
  // which ToolJet reads from properties). Moved rather than stripped as an unknown style. New definitions only: a
  // persisted definition can carry legacy style leaves ToolJet itself wrote, which an update must not reinterpret.
  if (schema && options.stripUnknownKeys) {
    for (const key of Object.keys(stylesValue)) {
      if (knownStyleKeys!.has(key) || !knownPropertyKeys!.has(key)) continue;
      if (properties[key] === undefined) {
        properties[key] = stylesValue[key];
        propertyPatch[key] = stylesValue[key];
      }
      delete stylesValue[key];
      stylesChanged = true;
      warnings.push(
        `${component.type} "${component.name}": moved styles.${key} to properties.${key} (ToolJet reads it from properties for ${component.type}).`
      );
    }
  }
  if (stylesChanged) normalizedSections.styles.value = stylesValue;

  // New definitions only: these NumberInput bounds have one source-verified destination.
  // Never choose between conflicting constraints or reinterpret a legacy persisted update.
  if (options.stripUnknownKeys && component.type === 'NumberInput') {
    for (const key of ['minValue', 'maxValue']) {
      const value = propValue(properties, key);
      if (value == null || (typeof value === 'string' && !value.trim())) continue;
      const validation = normalizedSections.validation.value ?? {};
      const current = propValue(validation, key);
      if (validation[key] !== undefined && current !== value) continue;
      validation[key] = properties[key];
      normalizedSections.validation.value = validation;
      normalizedSections.validation.patch = { ...normalizedSections.validation.patch, [key]: validation[key] };
      delete properties[key];
      warnings.push(`NumberInput "${component.name}": moved properties.${key} to validation.${key}, where the renderer reads the bound.`);
    }
  }

  // Older catalog snapshots exposed clientServerSwitch's editor labels as enum values even
  // though ToolJet persists these controls as booleans. Accept the common model-authored form
  // and canonicalize it before linting/writing so it does not create a repair turn.
  for (const key of CLIENT_SERVER_BOOLEAN_KEYS) {
    const current = propValue(properties, key);
    if (current !== 'clientSide' && current !== 'serverSide') continue;
    setProperty(key, current === 'serverSide');
    warnings.push(
      `${component.name} "${key}": normalized ${JSON.stringify(current)} to a boolean ToolJet binding.`
    );
  }

  // A pack card (cardStyle shadcnCard / antCard) fits its content; equal heights in a row come from the row's
  // stretch. A churn card fixed at 780px with dynamicHeight off kept 140px under its table.
  if (component.type === 'FlexContainer') {
    const card = propValue(properties, 'cardStyle');
    if ((card === 'shadcnCard' || card === 'antCard') && !isTruthy(propValue(properties, 'dynamicHeight'))) {
      setProperty('dynamicHeight', '{{true}}');
    }
  }

  if (component.type === 'Table') {
    // A shadcn-look table drawn shorter than its rows per page showed a row and a half and scrolled inside its card
    // (an incident console, four cards). Fewer rows per page when three or more fit, else the table fits its rows.
    const lookEntry0 = stylesValue.tableLook;
    const look0 = lookEntry0 && typeof lookEntry0 === 'object' ? (lookEntry0 as { value?: unknown }).value : lookEntry0;
    const height = (component.layouts?.desktop ?? component.layout)?.height;
    const staticNumber = (v: unknown): number | undefined => {
      const m = typeof v === 'number' ? String(v) : typeof v === 'string' ? /^\s*(?:\{\{\s*)?(\d+)\s*(?:\}\})?\s*$/.exec(v)?.[1] : undefined;
      return m !== undefined ? Number(m) : undefined;
    };
    const isFalse = (v: unknown) => v === false || (typeof v === 'string' && /^\s*(\{\{\s*)?false(\s*\}\})?\s*$/.test(v));
    // A shadcn data table is as tall as its rows. Drawn heights left a band under the last row (a store dashboard, a
    // churn report, a fleet view) or cut rows off (an incident console), so dynamicHeight turns on unless set.
    if (look0 === 'shadcn' && properties.dynamicHeight === undefined) {
      setProperty('dynamicHeight', '{{true}}');
    }
    if (
      look0 === 'shadcn' &&
      typeof height === 'number' &&
      !isTruthy(propValue(properties, 'dynamicHeight')) &&
      !isTruthy(propValue(properties, 'serverSidePagination')) &&
      !isFalse(propValue(properties, 'enablePagination'))
    ) {
      const rowsPerPage = staticNumber(propValue(properties, 'rowsPerPage')) ?? 10;
      const toolbar = isFalse(propValue(properties, 'displaySearchBox')) ? 0 : 64;
      // The look's measured chrome: toolbar, a 40px header, the footer and borders; rows are about 45px.
      const fit = Math.floor((height - toolbar - 40 - 58) / 45);
      if (fit < rowsPerPage) {
        if (fit >= 3) {
          setProperty('rowsPerPage', `{{${fit}}}`);
          warnings.push(`Table "${component.name}": height ${height}px fits ${fit} rows; rowsPerPage is now ${fit} so no row is cut off.`);
        } else {
          setProperty('dynamicHeight', '{{true}}');
          warnings.push(`Table "${component.name}": height ${height}px fits fewer than 3 rows; dynamicHeight is on so the table fits its rows.`);
        }
      }
    }
    // Selection without bulk select draws a checkbox per row unless the selected row is highlighted: shadcn-look
    // tables in an incident console, an energy dashboard and a clinic showed checkboxes nothing used. The row
    // highlights instead; selectedRow works the same.
    if (
      look0 === 'shadcn' &&
      properties.highlightSelectedRow === undefined &&
      !isTruthy(propValue(properties, 'showBulkSelector')) &&
      !isFalse(propValue(properties, 'allowSelection'))
    ) {
      setProperty('highlightSelectedRow', '{{true}}');
    }
    if (properties.useDynamicColumn === undefined) {
      setProperty('useDynamicColumn', catalogDefault('Table', 'useDynamicColumn', '{{false}}'));
    }
    if (properties.columnData === undefined) {
      setProperty(
        'columnData',
        catalogDefault(
          'Table',
          'columnData',
          "{{[{name: 'email', key: 'email', id: '1'}, {name: 'Full name', key: 'name', id: '2', isEditable: true}]}}"
        )
      );
    }

    const columns = propValue(properties, 'columns');
    const dynamicColumns = isTruthy(propValue(properties, 'useDynamicColumn'));
    const autogenerateColumns = propValue(properties, 'autogenerateColumns');
    if (options.stripUnknownKeys && columns === undefined && !dynamicColumns && isTruthy(autogenerateColumns) &&
        typeof propValue(properties, 'data') === 'string' && /\bqueries(?:\.|\[)/.test(String(propValue(properties, 'data')))) {
      // New query-bound tables have no authored columns yet. Override the widget's demo columns;
      // the browser will generate real columns when the query returns. Otherwise server-side
      // verification compares fields like photo/email with unrelated datasource rows.
      setProperty('columns', []);
    }
    if (Array.isArray(columns) && !dynamicColumns && !isTruthy(autogenerateColumns)) {
      setProperty('autogenerateColumns', true);
      if (autogenerateColumns !== undefined) {
        warnings.push(
          `Table "${component.name}": normalized autogenerateColumns from false to true for runtime compatibility. ` +
            'Some ToolJet Table versions crash while generating transformations for explicit static columns when it is false. ' +
            'Project the data binding to intended keys and declare behavior-only keys with columnVisibility:false.'
        );
      }
    }

    // A datepicker column with BOTH date selection and time disabled always renders BLANK: the table's
    // DatePickerRenderer.computeDateString returns '' when (!isDateSelectionEnabled && !isTimeChecked),
    // so correct data with a matching parseDateFormat still shows nothing. Models set
    // isDateSelectionEnabled:false thinking it means "read-only"; re-enable date selection so the value
    // displays. Only touches this exact blank-rendering combination.
    if (Array.isArray(columns)) {
      const lookEntry = stylesValue.tableLook;
      const shadcnLook =
        (lookEntry && typeof lookEntry === 'object' ? (lookEntry as { value?: unknown }).value : lookEntry) === 'shadcn';
      // Rows of one line in the shadcn look: long subjects wrapped into uneven two-line rows, which reviewers marked as
      // unfinished; the look ends long text in an ellipsis instead.
      // A column that draws more than a line (html, long text, json, an image) needs rows that grow: at one line a
      // two-line html reservation overlapped the row below. Such a table keeps wrapping, turned back on if it was off.
      const wrapNow = (stylesValue.contentWrap as { value?: unknown } | undefined)?.value ?? stylesValue.contentWrap;
      const multiLine = columns.some(
        (c) =>
          c && typeof c === 'object' && !Array.isArray(c) &&
          (c as Record<string, unknown>).columnVisibility !== false &&
          ['html', 'text', 'json', 'image', 'markdown'].includes(String((c as Record<string, unknown>).columnType))
      );
      if (shadcnLook && multiLine && wrapNow === false) setStyle('contentWrap', true);
      else if (shadcnLook && !multiLine && wrapNow !== false) setStyle('contentWrap', false);
      let changedColumns = false;
      const repairedColumns = columns.map((column) => {
        if (options.stripUnknownKeys && column && typeof column === 'object' && !Array.isArray(column) &&
            column.columnType === 'button' && Array.isArray(column.buttons)) {
          const buttons = column.buttons.map((button: unknown) => {
            if (!button || typeof button !== 'object' || Array.isArray(button)) return button;
            const b = button as Record<string, unknown>;
            if (typeof b.label !== 'string' || b.buttonLabel !== undefined) return button;
            const { label, ...rest } = b;
            changedColumns = true;
            warnings.push(`Table "${component.name}" action "${b.id}": moved label to buttonLabel, where the renderer reads the caption.`);
            return { ...rest, buttonLabel: label };
          });
          column = { ...column, buttons };
        }
        if (
          column && typeof column === 'object' && !Array.isArray(column) &&
          (column as Record<string, unknown>).columnType === 'datepicker' &&
          (column as Record<string, unknown>).isDateSelectionEnabled === false &&
          (column as Record<string, unknown>).isTimeChecked !== true
        ) {
          changedColumns = true;
          const entry = column as Record<string, unknown>;
          warnings.push(
            `Table "${component.name}" date column "${entry.name ?? entry.key}": enabled date selection — a ` +
              'datepicker column with both date selection and time disabled renders blank regardless of the data.'
          );
          return { ...entry, isDateSelectionEnabled: true };
        }
        // A read-only date column in the shadcn look authored in a machine format (YYYY-MM-DD) showed 2026-10-12; it parses
        // with that format and displays a readable date. Editable columns keep what the author typed into.
        if (
          shadcnLook && column && typeof column === 'object' && !Array.isArray(column) &&
          (column as Record<string, unknown>).columnType === 'datepicker' &&
          !isTruthy((column as Record<string, unknown>).isEditable) &&
          /^Y{4}[-/]MM[-/]DD$/.test(String((column as Record<string, unknown>).dateFormat ?? '').trim())
        ) {
          changedColumns = true;
          const entry = column as Record<string, unknown>;
          column = { ...entry, parseDateFormat: entry.parseDateFormat ?? entry.dateFormat, dateFormat: 'MMM D, YYYY' };
        }
        // A state (one severity, status or stage per row) drawn as a read-only multi-select showed "Select.." on every
        // row: the multi-select reads an array and the value was one string. A single select shows it.
        if (
          column && typeof column === 'object' && !Array.isArray(column) &&
          (column as Record<string, unknown>).columnType === 'newMultiSelect' &&
          !isTruthy((column as Record<string, unknown>).isEditable) &&
          /^(status|severity|priority|stage|state|level|risk)$/i.test(
            String((column as Record<string, unknown>).key ?? (column as Record<string, unknown>).name ?? '').replace(/[_\s-]+/g, '')
          )
        ) {
          changedColumns = true;
          const entry = column as Record<string, unknown>;
          warnings.push(`Table "${component.name}" column "${entry.name ?? entry.key}": a single state per row; columnType is now "select" (a multi-select shows "Select.." for a single value).`);
          column = { ...entry, columnType: 'select' };
        }
        // The shadcn look reads numbers right-aligned (shadcn's data table, and how money and counts scan down a
        // column); a number column that sets no alignment gets right, which the inspector shows and can change.
        // It also groups thousands (100000 reads 100,000) unless the column says otherwise.
        if (
          shadcnLook && column && typeof column === 'object' && !Array.isArray(column) &&
          (column as Record<string, unknown>).columnType === 'number' &&
          ((column as Record<string, unknown>).horizontalAlignment === undefined ||
            (column as Record<string, unknown>).thousandSeparator === undefined)
        ) {
          changedColumns = true;
          const entry = column as Record<string, unknown>;
          column = {
            ...entry,
            horizontalAlignment: entry.horizontalAlignment ?? 'right',
            thousandSeparator: entry.thousandSeparator ?? true,
          };
        }
        if (shadcnLook && column && typeof column === 'object' && !Array.isArray(column)) {
          const entry = column as Record<string, unknown>;
          const words = `${String(entry.key ?? '')} ${String(entry.name ?? '')}`.replace(/[_-]+/g, ' ');
          const next: Record<string, unknown> = { ...entry };
          // Money reads with two decimals (19.50, not 19.5) unless the column says otherwise (builds of 2026-10-10
          // showed "Amount 19.5" and "Retail price 3.5").
          if (entry.columnType === 'number' && entry.decimalPlaces === undefined && MONEY_WORDS.test(words) && !UNIT_WORDS.test(words)) {
            next.decimalPlaces = 2;
          }
          // A read-only state (status, stage, priority) is drawn as a status chip, whose tone the Table reads from the
          // value's words. Plain text was what the builds shipped, though the lint asked for chips.
          if (
            ['string', undefined].includes(entry.columnType as string | undefined) &&
            entry.displayAsChip === undefined && !isTruthy(entry.isEditable) && STATE_WORDS.test(words)
          ) {
            next.displayAsChip = true;
          }
          // A header needs its label's width plus the cell padding, and the pencil of an editable column: "On hand"
          // at 60px read "On h...".
          const size = Number(entry.columnSize);
          const label = String(entry.name ?? entry.key ?? '');
          if (Number.isFinite(size) && size > 0 && label) {
            // An address needs about 240px on one line; at 185px "sofia.alvarez@example.c / om" broke mid-word.
            const email = /\be ?mail\b/i.test(words) ? 240 : 0;
            // A status chip needs room for its longest state ("Waiting on customer" was cut at 100px).
            const chip = next.displayAsChip === true || entry.displayAsChip === true ? 140 : 0;
            const needed = Math.max(email, chip, Math.ceil(label.length * 7.5) + 32 + (isTruthy(entry.isEditable) ? 18 : 0));
            if (size < needed) next.columnSize = needed;
          }
          // A row action in the default colours is an outline button, as shadcn's data table draws row actions: a
          // filled brand button on every row ("Update" down a CRM table) was the loudest thing on the page. A button
          // given its own colour (a red Delete) keeps it.
          if (entry.columnType === 'button' && Array.isArray(entry.buttons)) {
            const buttons = (entry.buttons as unknown[]).map((button) => {
              if (!button || typeof button !== 'object' || Array.isArray(button)) return button;
              const b = button as Record<string, unknown>;
              const bg = b.buttonBackgroundColor;
              const defaultBg = bg === undefined || ['#4368E3', '#4368e3', 'var(--cc-primary-brand)'].includes(String(bg));
              return (b.buttonType === undefined || b.buttonType === 'solid') && defaultBg ? { ...b, buttonType: 'outline' } : button;
            });
            if (buttons.some((b, i) => b !== (entry.buttons as unknown[])[i])) next.buttons = buttons;
          }
          if (Object.keys(next).some((k) => next[k] !== entry[k])) {
            changedColumns = true;
            column = next;
          }
        }
        return column;
      });
      // Visible columns wider than a page (about 1240px inside a card) scale down together: the last ones ran under the
      // frozen actions column. A column keeps at least its header's width; unsized columns count as 120px.
      if (shadcnLook) {
        const visible = repairedColumns.filter(
          (c): c is Record<string, unknown> => !!c && typeof c === 'object' && !Array.isArray(c) && (c as Record<string, unknown>).columnVisibility !== false
        );
        const width = (c: Record<string, unknown>) => (Number(c.columnSize) > 0 ? Number(c.columnSize) : 120);
        const total = visible.reduce((sum, c) => sum + width(c), 0);
        if (visible.length > 1 && total > 1240) {
          const factor = 1240 / total;
          const floor = (c: Record<string, unknown>) =>
            c.columnType === 'button'
              ? 110
              : Math.max(
                  /\be ?mail\b/i.test(`${String(c.key ?? '')} ${String(c.name ?? '')}`.replace(/[_-]+/g, ' ')) ? 240 : 64,
                  Math.ceil(String(c.name ?? c.key ?? '').length * 7.5) + 32
                );
          for (let i = 0; i < repairedColumns.length; i++) {
            const c = repairedColumns[i] as Record<string, unknown>;
            if (!visible.includes(c)) continue;
            repairedColumns[i] = { ...c, columnSize: Math.max(floor(c), Math.floor(width(c) * factor)) };
          }
          changedColumns = true;
          warnings.push(`Table "${component.name}": its visible columns (${total}px) were wider than a page; they now scale to fit about 1240px.`);
        }
      }
      // The first column of people shows an avatar beside each name, as a designed CRM or helpdesk table does (an
      // email, id or editable column never; "name" alone may be a product's, so only words that name a person count).
      if (shadcnLook) {
        const index = repairedColumns.findIndex((c) => {
          if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
          const entry = c as Record<string, unknown>;
          const words = `${String(entry.key ?? '')} ${String(entry.name ?? '')}`.replace(/[_-]+/g, ' ');
          return entry.columnVisibility !== false && ['string', undefined].includes(entry.columnType as string | undefined) &&
            PERSON_WORDS.test(words) && !/\b(e ?mail|id|phone|count|type|notes?)\b/i.test(words);
        });
        const entry = index >= 0 ? (repairedColumns[index] as Record<string, unknown>) : undefined;
        if (entry && entry.displayAvatar === undefined && entry.displayAsChip === undefined && !isTruthy(entry.isEditable)) {
          repairedColumns[index] = { ...entry, displayAvatar: true };
          changedColumns = true;
        }
      }
      if (changedColumns) setProperty('columns', repairedColumns);
    }
  }

  // A money KPI bound to a number shows it as currency: "Revenue this week 947.37" read like a count. A binding that
  // formats its own text ('$' + ..., toLocaleString, toFixed) or a typed figure is left as written, and so is an
  // explicit valueFormat. The Stat shows text unchanged, so a binding that returns text is unaffected anyway.
  // "auto" is the agent's way of not choosing, so it counts as unset. A binding that ends by formatting its own number
  // without a currency (".toLocaleString('en-US', { minimumFractionDigits: 2 })", ".toFixed(2)") showed "822.54" for
  // a month's spend: the trailing call is dropped so the Stat formats the number as currency.
  const statFormat = propValue(properties, 'valueFormat');
  if (component.type === 'ShadStat' && (statFormat === undefined || statFormat === 'auto')) {
    const label = String(propValue(properties, 'label') ?? '');
    let value = propValue(properties, 'value');
    const moneyLabel = MONEY_WORDS.test(label.replace(/[_-]+/g, ' ')) && !COUNT_WORDS.test(label);
    const trailingFormat = /\.(?:toLocaleString\((?:[^()]|\([^()]*\))*\)|toFixed\(\s*\d*\s*\))\s*\}\}\s*$/;
    if (
      moneyLabel && typeof value === 'string' && trailingFormat.test(value) &&
      !/[$€£₹¥]|Intl\.|currency/i.test(value)
    ) {
      value = value.replace(trailingFormat, '}}');
      setProperty('value', value);
    }
    if (
      typeof value === 'string' && /^\s*\{\{[\s\S]*\}\}\s*$/.test(value) &&
      !/[$€£₹¥]|toLocaleString|toFixed|Intl\.|currency/i.test(value) &&
      moneyLabel
    ) {
      setProperty('valueFormat', 'currency');
    }
  }

  if (component.type === 'KeyValuePair') {
    const fields = propValue(properties, 'fields');
    if (Array.isArray(fields) && fields.length > 0) {
      const explicitIds = new Set(
        fields.flatMap((field) => {
          const id = field && typeof field === 'object' ? (field as Record<string, unknown>).id : undefined;
          return typeof id === 'string' && id.length > 0 ? [id] : [];
        })
      );
      const demoFields = catalogDefault('KeyValuePair', 'fields', []);
      const currentHistory = propValue(properties, 'fieldDeletionHistory');
      const deletionHistory = new Set(
        Array.isArray(currentHistory)
          ? currentHistory.filter((key): key is string => typeof key === 'string' && key.length > 0)
          : []
      );
      const before = deletionHistory.size;
      if (Array.isArray(demoFields)) {
        for (const field of demoFields) {
          if (!field || typeof field !== 'object') continue;
          const { id, key } = field as Record<string, unknown>;
          if (typeof key === 'string' && !explicitIds.has(String(id ?? ''))) deletionHistory.add(key);
        }
      }
      if (deletionHistory.size > before || properties.fieldDeletionHistory === undefined) {
        setProperty('fieldDeletionHistory', [...deletionHistory]);
        warnings.push(
          `KeyValuePair "${component.name}": normalized fieldDeletionHistory so ToolJet does not append or ` +
            'positionally merge catalog demo fields into the explicit fields array.'
        );
      }
    }
  }

  if (component.type === 'Statistics') {
    // Auto-size the value so a value-only tile with an icon doesn't clip/wrap (e.g. a currency value
    // rendering as "$3", or "$129,426.32" wrapping to two lines). Deterministic fix — removes a lint
    // iteration; the model can still widen or drop the icon instead if it prefers a larger value font.
    const width = (component.layouts?.desktop ?? component.layout)?.width;
    const iconName = propValue(properties, 'icon');
    const iconVisible =
      typeof iconName === 'string' && iconName.trim() !== '' &&
      propValue(properties, 'iconVisibility') !== false && propValue(properties, 'iconVisibility') !== '{{false}}';
    // primaryValueSize is a STYLES key; also tolerate a model that misplaced it under properties.
    const rawSize = propValue(stylesValue, 'primaryValueSize') ?? propValue(properties, 'primaryValueSize');
    const sizeText = typeof rawSize === 'string' ? rawSize.replace(/[{}]/g, '').trim() : rawSize;
    const numericSize =
      typeof sizeText === 'number' ? sizeText
      : typeof sizeText === 'string' && /^\d+$/.test(sizeText) ? Number(sizeText) : undefined;
    // Currency / fractional hero values are reliably long (grouping commas + ".00"), so they clip even
    // in wider tiles — and the layout width is often assigned AFTER the component is added (a separate
    // update_layout), so a width-only gate silently misses them. Treat a currency-formatted value as
    // clip-prone regardless of the (possibly-unknown) width.
    const rawValue = propValue(properties, 'primaryValue');
    const currencyValue =
      typeof rawValue === 'string' &&
      /minimumFractionDigits|style\s*:\s*['"]currency['"]|[$£€¥]/.test(rawValue);
    const widthKnown = typeof width === 'number';
    const narrowTile = widthKnown && width < STATISTICS_ICON_VALUE_MIN_SAFE_WIDTH_COLS;
    // Two clip modes: (a) an icon eats horizontal room, so even a short value clips in a narrow tile;
    // (b) a currency/fractional value is long enough to wrap on its own — no icon needed — so shrink
    // unless the tile is known to be wide. Width is often unknown here (assigned by a later
    // update_layout), so a currency value with unknown width is treated as clip-prone.
    const clipProne = (iconVisible && narrowTile) || (currencyValue && (narrowTile || !widthKnown));
    if (
      isTruthy(propValue(properties, 'hideSecondary')) &&
      (numericSize === undefined || numericSize > 22) &&
      clipProne
    ) {
      setStyle('primaryValueSize', '{{22}}');
      warnings.push(
        `Statistics "${component.name}": set styles.primaryValueSize to 22 so the ${currencyValue ? 'currency ' : ''}value ` +
          `fits a value-only tile${widthKnown ? ` (${width} columns wide)` : ''} ` +
          '(larger sizes clip or wrap the value).'
      );
    }
  }

  // Strict catalog validation for new components: strip keys ToolJet would silently ignore so they
  // never persist as cruft. Skipped entirely for unknown component types (no schema to trust).
  if (options.stripUnknownKeys) {
    const schema = getComponentSchema(component.type);
    if (schema) {
      const sections: Array<['properties' | 'styles', Record<string, unknown> | undefined]> = [
        ['properties', properties],
        ['styles', normalizedSections.styles.value],
      ];
      for (const [section, sectionValue] of sections) {
        if (!sectionValue) continue;
        const knownKeys = ((schema[section] ?? []) as Array<{ key: string }>).map((entry) => entry.key);
        for (const key of Object.keys(sectionValue)) {
          if (!isStrippableUnknownKey(component.type, section, key, knownKeys)) continue;
          delete sectionValue[key];
          warnings.push(
            `${component.type} "${component.name}": removed unknown ${section} key "${key}" — ToolJet ignores ` +
              'it, so it is kept out of the saved definition rather than persisted as an unusable key.'
          );
        }
      }
    }
  }

  // ToolJet ends a {{ }} expression at the first "}}" it sees, so two adjacent closing braces inside a
  // binding (a nested object literal, a Plotly layout, an IIFE ending "}})()") blank the component with no
  // error. "} }" is identical JavaScript; insert the space so the binding survives. Runs on every write
  // path (planned apply, add, update) because every host model writes this at least occasionally.
  const braceFixedKeys: string[] = [];
  for (const key of Object.keys(properties)) {
    const result = separateAdjacentClosingBracesDeep(propValue(properties, key));
    if (!result.changed) continue;
    setProperty(key, result.value);
    braceFixedKeys.push(`properties.${key}`);
  }
  for (const key of Object.keys(stylesValue)) {
    const result = separateAdjacentClosingBracesDeep(propValue(stylesValue, key));
    if (!result.changed) continue;
    setStyle(key, result.value);
    braceFixedKeys.push(`styles.${key}`);
  }
  if (braceFixedKeys.length) {
    warnings.push(
      `${component.type} "${component.name}": separated adjacent closing braces inside ${braceFixedKeys.join(', ')} ` +
        '(ToolJet ends a {{ }} expression at the first "}}", which would have left the component blank). ' +
        'Write nested closes as "} }" inside bindings.'
    );
  }

  // A true/false property given a bare expression ("queries.getFlights.isLoading") without {{ }} is plain text, which
  // ToolJet reads as true: three Air India tables showed their loading spinner forever. Wrap it.
  const booleanKeys = new Set(['loadingState', 'visibility', 'disabledState']);
  for (const entry of schema?.properties ?? []) if (entry.valueType === 'boolean') booleanKeys.add(entry.key);
  const BARE_EXPRESSION = /^\s*!?\s*\(?\s*(queries|components|variables|globals|page|constants|parameters)\.[\w$]/;
  const wrappedKeys: string[] = [];
  for (const key of booleanKeys) {
    const current = propValue(properties, key);
    if (typeof current !== 'string' || current.includes('{{') || !BARE_EXPRESSION.test(current)) continue;
    const entry = properties[key];
    const wrapped = { ...(entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {}), value: `{{${current.trim()}}}`, fxActive: true };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
    wrappedKeys.push(key);
  }
  if (wrappedKeys.length) {
    warnings.push(
      `${component.type} "${component.name}": wrapped the bare expression in ${wrappedKeys.map((k) => `properties.${k}`).join(', ')} ` +
        'in {{ }}; without the braces ToolJet reads it as text, which counts as true (a table stays on its loading spinner).'
    );
  }

  // A text property holding a whole JavaScript expression without {{ }} shows the code on screen: an expense KPI read
  // "String((queries.get_expenses.data || []).filter(r => ...).length) + ' expenses awaiting review'". Only a value
  // that is plainly code (opens with a call, a bracket or a ToolJet root, references one and uses an operator) is
  // wrapped; prose that mentions a query is left alone.
  const CODE_START = /^\s*(?:String|Number|Math|moment|Intl|JSON|Object|Array)\s*[.(]|^\s*[([!]|^\s*(?:queries|components|variables|globals|page|constants|parameters)\.[\w$]/;
  const CODE_ROOT = /\b(?:queries|components|variables|globals|constants|parameters)\.[\w$]/;
  const CODE_OPERATOR = /=>|\|\||&&|===|!==|\.length\b|\.(?:filter|map|reduce|toFixed|toLocaleString|find|some)\s*\(/;
  const codeKeys: string[] = [];
  const showsCode = /CodeEditor|Html|Markdown|RichText|Json/i.test(component.type ?? '');
  for (const [key, entry] of Object.entries(showsCode ? {} : properties)) {
    if (booleanKeys.has(key)) continue;
    const current = propValue(properties, key);
    if (typeof current !== 'string' || current.includes('{{') || current.length > 2000) continue;
    if (!CODE_START.test(current) || !CODE_ROOT.test(current) || !CODE_OPERATOR.test(current)) continue;
    const wrapped = { ...(entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {}), value: `{{${current.trim()}}}` };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
    codeKeys.push(key);
  }
  if (codeKeys.length) {
    warnings.push(
      `${component.type} "${component.name}": ${codeKeys.map((k) => `properties.${k}`).join(', ')} held a JavaScript ` +
        'expression without {{ }}, which shows the code on screen; it is now wrapped in {{ }}.'
    );
  }

  const patch = Object.fromEntries(
    (['properties', 'styles', 'validation', 'others'] as DefinitionSection[]).flatMap((section) => {
      const envelopePatch = normalizedSections[section].patch ?? {};
      const semanticPatch = section === 'properties' ? propertyPatch : section === 'styles' ? stylePatch : {};
      const merged = { ...envelopePatch, ...semanticPatch };
      return Object.keys(merged).length ? [[section, merged]] : [];
    })
  ) as ComponentNormalization['patch'];

  return {
    component: {
      ...component,
      properties,
      ...(normalizedSections.styles.value ? { styles: normalizedSections.styles.value } : {}),
      ...(normalizedSections.validation.value ? { validation: normalizedSections.validation.value } : {}),
      ...(normalizedSections.others.value ? { others: normalizedSections.others.value } : {}),
    } as T,
    patch,
    warnings,
  };
}
