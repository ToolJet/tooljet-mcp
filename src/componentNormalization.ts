import { getComponentSchema } from './catalog.js';
import { STYLE_KEYS_IN_PROPERTIES, PROPERTY_KEY_ALIASES, nearestCatalogKey } from './lint.js';
import type { ComponentSpec } from './tooljetClient.js';

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
  for (const key of Object.keys(properties)) {
    const aliasTarget = PROPERTY_KEY_ALIASES[key.toLowerCase()];
    const canonical = aliasTarget ?? key;
    const belongsInStyles = canonical !== 'styles' && STYLE_KEYS_IN_PROPERTIES.has(canonical);
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
  if (stylesChanged) normalizedSections.styles.value = stylesValue;

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

  if (component.type === 'Table') {
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
      let fixedDateColumn = false;
      const repairedColumns = columns.map((column) => {
        if (
          column && typeof column === 'object' && !Array.isArray(column) &&
          (column as Record<string, unknown>).columnType === 'datepicker' &&
          (column as Record<string, unknown>).isDateSelectionEnabled === false &&
          (column as Record<string, unknown>).isTimeChecked !== true
        ) {
          fixedDateColumn = true;
          const entry = column as Record<string, unknown>;
          warnings.push(
            `Table "${component.name}" date column "${entry.name ?? entry.key}": enabled date selection — a ` +
              'datepicker column with both date selection and time disabled renders blank regardless of the data.'
          );
          return { ...entry, isDateSelectionEnabled: true };
        }
        return column;
      });
      if (fixedDateColumn) setProperty('columns', repairedColumns);
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
