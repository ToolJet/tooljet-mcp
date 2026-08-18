// Mechanical, catalog-independent checks that catch the render bugs the skill can only *advise*
// against. Used by add_component(s) (component-level, pre-write) and validate_app (whole-app,
// post-write). Errors block; warnings are surfaced to the agent but don't block.
import type { AppSummary } from './tooljetClient.js';
import { getComponentSchema } from './catalog.js';
import {
  FORM_SCHEMA_FIELD_TYPE_SET,
  SAFE_GENERATED_FORM_FIELD_TYPE_SET,
} from './formFieldTypes.js';

export interface LintResult {
  errors: string[];
  warnings: string[];
}

/** Style-ish keys ToolJet's renderer reads from `definition.styles`, NOT `properties` — placing them
 *  under `properties` is silently dropped. Single source of truth (also used by the client DTO builder). */
export const STYLE_KEYS_IN_PROPERTIES = new Set([
  'styles',
  'textSize',
  'fontWeight',
  'textColor',
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'boxShadow',
  'textAlign',
  'fontVariant',
  'padding',
  'accentColor',
  'iconColor',
]);

/** ToolJet Table column header casing — the ONLY valid values (table.js: 'As typed' / 'AA'). */
export const VALID_HEADER_CASING = new Set(['none', 'uppercase']);

/** Form inputs that carry a label \`alignment\` style ('side' default / 'top'). A narrow one with a
 *  side label wastes most of its width on the label — warn and suggest top alignment. */
export const FORM_INPUT_TYPES = new Set([
  'TextInput',
  'NumberInput',
  'CurrencyInput',
  'PasswordInput',
  'EmailInput',
  'PhoneInput',
  'TextArea',
  'DropdownV2',
  'MultiselectV2',
  'DatePickerV2',
  'DatetimePickerV2',
  'TimePicker',
  'TreeSelect',
  'RadioButtonV2',
]);

/** Exact ToolJet INPUT_COMPONENTS_FOR_FORM list. When one of these widgets uses a top-aligned
 * label, the canvas renderer adds TOP_ALIGNMENT_HEIGHT_INCREMENT (20px) to its authored height. */
export const TOP_ALIGNED_INPUT_TYPES = new Set([
  'TextInput',
  'PasswordInput',
  'EmailInput',
  'PhoneInput',
  'CurrencyInput',
  'NumberInput',
  'DropdownV2',
  'MultiselectV2',
  'Cascader',
  'RadioButtonV2',
  'DatetimePickerV2',
  'Checkbox',
  'ToggleSwitchV2',
  'DatePickerV2',
  'TimePicker',
  'DaterangePicker',
  'TextArea',
  'StarRating',
  'TagsInput',
  'ColorPicker',
  'ButtonGroupV2',
]);
export const TOP_ALIGNMENT_HEIGHT_INCREMENT = 20;
/** At or below this width (grid columns), a side-aligned label leaves too little room for the input. */
const NARROW_SIDE_LABEL_COLS = 18;

interface Rect {
  top?: number;
  left?: number;
  width?: number;
  height?: number;
}
export interface LintComponent {
  id?: string;
  name?: string;
  type?: string;
  properties?: Record<string, unknown>;
  styles?: Record<string, unknown>;
  layout?: Rect;
  layouts?: { desktop?: Rect; mobile?: Rect };
  clientRef?: string;
  parentRef?: string;
  parent?: string;
}

/** Read a property whose value is wrapped as `{ value: X }` (ToolJet's shape), or a bare value. */
function propVal(props: Record<string, unknown> | undefined, key: string): unknown {
  const p = props?.[key] as { value?: unknown } | undefined;
  return p && typeof p === 'object' && 'value' in p ? p.value : p;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function isTruthyBinding(v: unknown): boolean {
  return v === true || v === '{{true}}' || v === 'true';
}

function isFalseBinding(v: unknown): boolean {
  return v === false || v === '{{false}}' || v === 'false';
}

function differsFromCatalogDefault(type: string, key: string, value: unknown): boolean {
  if (value === undefined) return false;
  const defaultValue = getComponentSchema(type)?.properties.find((property) => property.key === key)?.default;
  return defaultValue === undefined || JSON.stringify(value) !== JSON.stringify(defaultValue);
}

function staticNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const match = v.trim().match(/^(?:\{\{\s*)?(\d+(?:\.\d+)?)(?:\s*\}\})?(?:px)?$/);
    if (match) return Number(match[1]);
  }
  return fallback;
}

/** ToolJet adds 20px outside the authored layout box for a top-aligned labelled form input.
 * Missing label metadata is treated as the catalog default (labelType:auto), which also increments. */
export function renderedHeight(component: LintComponent, rect?: Rect): number {
  const layout = rect ?? component.layouts?.desktop ?? component.layout;
  const authored = layout?.height ?? 0;
  if (!TOP_ALIGNED_INPUT_TYPES.has(component.type ?? '')) return authored;
  if (propVal(component.styles, 'alignment') !== 'top') return authored;

  const labelType = propVal(component.properties, 'labelType');
  const label = propVal(component.properties, 'label');
  const hasRenderedLabel =
    labelType === undefined ||
    labelType === 'auto' ||
    label === undefined ||
    (typeof label === 'string' ? label.trim().length > 0 : Boolean(label));
  return authored + (hasRenderedLabel ? TOP_ALIGNMENT_HEIGHT_INCREMENT : 0);
}

function componentKey(component: LintComponent): string | undefined {
  return component.clientRef ?? component.id;
}

/** Lint a single component spec (pre-write). */
export function lintComponentSpec(spec: LintComponent): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const props = spec.properties ?? {};
  const label = spec.name ?? spec.type ?? 'component';

  // ERROR: style keys under `properties` are silently dropped by ToolJet.
  const misplaced = Object.keys(props).filter((k) => STYLE_KEYS_IN_PROPERTIES.has(k));
  if (misplaced.length) {
    errors.push(
      `Component "${label}": style keys ${JSON.stringify(misplaced)} are under \`properties\`, where ToolJet ` +
        `ignores them — move them to the top-level \`styles\` object.`
    );
  }

  // Layout sanity.
  const rects = [spec.layout, spec.layouts?.desktop, spec.layouts?.mobile].filter(Boolean) as Rect[];
  for (const r of rects) {
    if ((r.width ?? 0) <= 0 || (r.height ?? 0) <= 0) {
      warnings.push(`Component "${label}": layout has non-positive size (${r.width}×${r.height}) — it may be invisible.`);
    }
  }

  // Chart: the native title defaults to a non-empty string that clips at common dashboard sizes.
  if (spec.type === 'Chart') {
    const title = propVal(props, 'title');
    if (title === undefined) {
      warnings.push(
        `Chart "${label}": native title defaults to a non-empty string that clips at common sizes — set ` +
          `properties.title.value = "" and put a separate Text heading above the chart.`
      );
    } else if (typeof title === 'string' && title.trim() !== '') {
      warnings.push(
        `Chart "${label}": native title "${title}" can clip at dashboard sizes — prefer properties.title.value = "" ` +
          `+ a separate Text heading (enable a native title only after visual verification).`
      );
    }
  }

  // DropdownV2 has two mutually exclusive option surfaces. ToolJet persists defaults for both, so
  // compare with the exact catalog defaults and warn only when the caller authored a custom value.
  if (spec.type === 'DropdownV2') {
    const advanced = propVal(props, 'advanced');
    const schema = propVal(props, 'schema');
    const options = propVal(props, 'options');
    const customSchema = differsFromCatalogDefault('DropdownV2', 'schema', schema);
    const customOptions = differsFromCatalogDefault('DropdownV2', 'options', options);

    if (customSchema && customOptions) {
      warnings.push(
        `DropdownV2 "${label}": custom \`schema\` and custom \`options\` are both present, but the modes are mutually exclusive. ` +
          `Use schema with properties.advanced.value="{{true}}", or options with advanced="{{false}}".`
      );
    }
    if (customSchema && (advanced === undefined || isFalseBinding(advanced))) {
      warnings.push(
        `DropdownV2 "${label}": custom \`schema\` is silently ignored unless properties.advanced.value="{{true}}"; ` +
          `ToolJet will render the static options instead.`
      );
    }
    if (customOptions && isTruthyBinding(advanced)) {
      warnings.push(
        `DropdownV2 "${label}": custom \`options\` are silently ignored while properties.advanced is true; ` +
          `use \`schema\` for dynamic mode or set advanced="{{false}}".`
      );
    }
  }

  // Table: data-binding + column config traps.
  if (spec.type === 'Table') {
    const data = propVal(props, 'data');
    const selector = propVal(props, 'dataSourceSelector');
    const autogen = propVal(props, 'autogenerateColumns');
    const columns = propVal(props, 'columns');
    const hasColumns = Array.isArray(columns);
    const projectsDataKeys = typeof data === 'string' && /\.map\s*\(/.test(data);
    if (data !== undefined && selector !== 'rawJson') {
      warnings.push(
        `Table "${label}": binds \`data\` but dataSourceSelector is not "rawJson" — it may render blank. ` +
          `Set properties.dataSourceSelector.value = "rawJson".`
      );
    }
    if (data !== undefined && !isTruthyBinding(autogen) && !hasColumns) {
      warnings.push(
        `Table "${label}": binds \`data\` with neither autogenerateColumns:true nor an explicit columns array — columns may not render.`
      );
    }
    if (hasColumns) {
      const columnKeys = new Map<string, number[]>();
      (columns as unknown[]).forEach((column, index) => {
        const key = (column as Record<string, unknown> | null)?.key;
        if (typeof key !== 'string' || !key) return;
        const indexes = columnKeys.get(key) ?? [];
        indexes.push(index);
        columnKeys.set(key, indexes);
      });
      for (const [key, indexes] of columnKeys) {
        if (indexes.length > 1) {
          errors.push(
            `Table "${label}": duplicate column key "${key}" at indexes ${indexes.join(', ')} — ToolJet silently keeps the last column. Use unique keys.`
          );
        }
      }
      if (isTruthyBinding(autogen) && !projectsDataKeys) {
        warnings.push(
          `Table "${label}": has an explicit columns array but autogenerateColumns is still true — ` +
            `ToolJet will append undeclared datasource fields (often technical IDs). Project the Table data binding to only the intended column keys; ` +
            `this is safer than disabling autogeneration, which can crash some ToolJet Table versions.`
        );
      }
      (columns as unknown[]).forEach((col, i) => {
        const c = col as Record<string, unknown> | null;
        for (const req of ['name', 'key']) {
          if (c == null || c[req] === undefined) {
            warnings.push(
              `Table "${label}" column[${i}]: missing \`${req}\` — explicit columns should be ` +
                `{name,key,id,columnType,columnSize,autogenerated:false}.`
            );
          }
        }
        if (c && c.headerCasing !== undefined && !VALID_HEADER_CASING.has(c.headerCasing as string)) {
          warnings.push(
            `Table "${label}" column[${i}]: headerCasing "${String(c.headerCasing)}" is invalid — use "none" (as typed) or "uppercase".`
          );
        }
        if (c?.columnType === 'button') {
          const buttons = c.buttons;
          if (!Array.isArray(buttons) || buttons.length === 0) {
            warnings.push(
              `Table "${label}" column[${i}]: button column needs a non-empty \`buttons\` array; ` +
                `read get_component_catalog({type:"Table",sections:["authoringHints"]}).`
            );
          } else {
            const ids = new Set<string>();
            buttons.forEach((button, buttonIndex) => {
              const id = (button as Record<string, unknown> | null)?.id;
              if (typeof id !== 'string' || id.length === 0) {
                warnings.push(
                  `Table "${label}" column[${i}] button[${buttonIndex}]: missing string \`id\`; ` +
                    `its event ref must be <column key or name>::<button id>.`
                );
              } else if (ids.has(id)) {
                warnings.push(`Table "${label}" column[${i}]: duplicate button id "${id}" makes event refs ambiguous.`);
              } else {
                ids.add(id);
              }
            });
          }
        }
      });
    }
    const legacyActions = propVal(props, 'actions');
    if (Array.isArray(legacyActions) && legacyActions.length > 0) {
      warnings.push(
        `Table "${label}": properties.actions is the deprecated row-action surface and can render without a reachable event. Use a columnType:"button" column plus table_column onClick events.`
      );
    }
    if (isTruthyBinding(propVal(props, 'serverSidePagination'))) {
      if (propVal(props, 'serverSideRowsPerPage') === undefined) {
        warnings.push(`Table "${label}": server-side pagination needs serverSideRowsPerPage bound to the query page size.`);
      }
      if (propVal(props, 'totalRecords') === undefined) {
        warnings.push(`Table "${label}": server-side pagination needs totalRecords bound to a separate count/metadata query.`);
      }
    }
  }

  if (spec.type === 'Form') {
    const mode = propVal(props, 'generateFormFrom');
    const schemaValue = propVal(props, 'newJsonSchema');
    if (mode === 'jsonSchema' && schemaValue === undefined) {
      warnings.push(`Form "${label}": generateFormFrom is "jsonSchema" but newJsonSchema is missing.`);
    }
    if (mode === 'rawJson' && propVal(props, 'JSONData') === undefined) {
      warnings.push(`Form "${label}": generateFormFrom is "rawJson" but JSONData is missing.`);
    }
    const fields = recordValue(recordValue(schemaValue)?.properties);
    if (mode === 'jsonSchema' && fields) {
      const standaloneRequiredFields: string[] = [];
      for (const [fieldName, rawField] of Object.entries(fields)) {
        const field = recordValue(rawField);
        if (!field) continue;
        const type = field.type;
        if (typeof type !== 'string' || !FORM_SCHEMA_FIELD_TYPE_SET.has(type)) {
          errors.push(
            `Form "${label}" field "${fieldName}": unsupported type "${String(type)}". ` +
              'Use the authoritative Form field-type list; aliases such as email/star/file do not work.'
          );
          continue;
        }
        if (type === 'filepicker') {
          errors.push(
            `Form "${label}" field "${fieldName}": type "filepicker" crashes the entire Form. ` +
              'Use a standalone FilePicker component and read components.<picker>.file instead.'
          );
        }
        if (type === 'datepicker' && (field.value === null || field.value === undefined)) {
          warnings.push(
            `Form "${label}" field "${fieldName}": a null/omitted datepicker value renders ToolJet's 01/01/2022 demo date. ` +
              'Set value to "{{null}}" for an empty create field.'
          );
        }
        if (['dropdown', 'multiselect'].includes(type)) {
          if ('options' in field) {
            errors.push(
              `Form "${label}" field "${fieldName}": ${type} uses "values" and "displayValues", not "options".`
            );
          }
          if (!('values' in field) || !('displayValues' in field)) {
            warnings.push(
              `Form "${label}" field "${fieldName}": ${type} should define both "values" and "displayValues".`
            );
          }
        }
        if (type !== 'filepicker' && !SAFE_GENERATED_FORM_FIELD_TYPE_SET.has(type)) {
          standaloneRequiredFields.push(`${fieldName} (${type})`);
        }
        const validation = recordValue(field.validation);
        if ('required' in field || validation?.required !== undefined) {
          warnings.push(
            `Form "${label}" field "${fieldName}": "required" is not a supported Form schema validator. ` +
              'Use validation.minLength or validation.customRule.'
          );
        }
      }
      if (standaloneRequiredFields.length > 0) {
        errors.push(
          `Form "${label}": generated fields ${standaloneRequiredFields.join(', ')} are not layout-safe. ` +
            'FormUtils cannot pass alignment through consistently; Dropdown/Multiselect labels become misaligned and TextArea retains a literal "Label". ' +
            'Build the entire form from standalone components with styles.alignment.value="top"; use a consistent two-column grid and full-width TextArea fields.'
        );
      }
    }
  }

  // Form input: a narrow field with a side-aligned label (the default) wastes width on the label.
  if (FORM_INPUT_TYPES.has(spec.type ?? '')) {
    const align = propVal(spec.styles, 'alignment'); // `alignment` is a STYLE, not a property
    const width = (spec.layouts?.desktop ?? spec.layout)?.width;
    if ((align === undefined || align === 'side') && typeof width === 'number' && width <= NARROW_SIDE_LABEL_COLS) {
      warnings.push(
        `${spec.type} "${label}": narrow (${width} cols) with a SIDE-aligned label (the default) — the label ` +
          `eats the input width. Set styles.alignment.value = "top" (label above the control), especially in forms/modals.`
      );
    }
  }

  return { errors, warnings };
}

/** Pairwise desktop-rect overlap within a set of components. */
export function detectOverlaps(components: LintComponent[]): string[] {
  const warnings: string[] = [];
  const items = components
    .map((c) => ({
      component: c,
      name: c.name ?? c.type ?? '?',
      r: c.layouts?.desktop ?? c.layout,
      parent: c.parentRef ?? c.parent ?? '__page__',
    }))
    .filter((x): x is { component: LintComponent; name: string; r: Rect; parent: string } => !!x.r);
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].parent !== items[j].parent) continue;
      const a = items[i].r;
      const b = items[j].r;
      const ax = a.left ?? 0,
        ay = a.top ?? 0,
        aw = a.width ?? 0,
        ah = renderedHeight(items[i].component, a);
      const bx = b.left ?? 0,
        by = b.top ?? 0,
        bw = b.width ?? 0,
        bh = renderedHeight(items[j].component, b);
      if (ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah) {
        const increments = [items[i], items[j]]
          .filter((item) => renderedHeight(item.component, item.r) > (item.r.height ?? 0))
          .map(
            (item) =>
              `"${item.name}" renders ${renderedHeight(item.component, item.r)}px tall ` +
              `(authored ${item.r.height ?? 0}px + ${TOP_ALIGNMENT_HEIGHT_INCREMENT}px for its top-aligned label)`
          );
        warnings.push(
          `Components "${items[i].name}" and "${items[j].name}" overlap at rendered desktop size` +
            (increments.length ? `; ${increments.join(' and ')}` : '') +
            `.`
        );
      }
    }
  }
  return warnings;
}

/** Modal checks work both before a batch write (clientRef/parentRef) and on persisted ids. */
export function lintModalChildren(components: LintComponent[]): string[] {
  const warnings: string[] = [];
  const refs = new Map(
    components.flatMap((component) => {
      const key = componentKey(component);
      return key ? [[key, component] as const] : [];
    })
  );
  const parentOf = (component: LintComponent): LintComponent | undefined =>
    refs.get(component.parentRef ?? component.parent ?? '');
  const modalChildren = components.filter((component) => {
    const parent = parentOf(component);
    return parent?.type === 'ModalV2' || parent?.type === 'Modal';
  });

  for (const child of modalChildren) {
    if (!FORM_INPUT_TYPES.has(child.type ?? '')) continue;
    const align = propVal(child.styles, 'alignment');
    if (align === undefined || align === 'side') {
      warnings.push(
        `${child.type} "${child.name ?? child.type}": modal form child uses a SIDE-aligned label — ` +
          `set styles.alignment.value = "top" so the control gets the full field width.`
      );
    }
  }

  for (let i = 0; i < modalChildren.length; i++) {
    for (let j = i + 1; j < modalChildren.length; j++) {
      const a = modalChildren[i];
      const b = modalChildren[j];
      if (
        (a.parentRef ?? a.parent) !== (b.parentRef ?? b.parent) ||
        !FORM_INPUT_TYPES.has(a.type ?? '') ||
        !FORM_INPUT_TYPES.has(b.type ?? '')
      ) continue;
      const ar = a.layouts?.desktop ?? a.layout;
      const br = b.layouts?.desktop ?? b.layout;
      if (!ar || !br) continue;
      const ax = ar.left ?? 0, aw = ar.width ?? 0, ay = ar.top ?? 0, ah = renderedHeight(a, ar);
      const bx = br.left ?? 0, bw = br.width ?? 0, by = br.top ?? 0, bh = renderedHeight(b, br);
      if (!(ax < bx + bw && bx < ax + aw)) continue;
      const gap = by >= ay + ah ? by - (ay + ah) : ay >= by + bh ? ay - (by + bh) : -1;
      if (gap >= 0 && gap < 20) {
        warnings.push(
          `Modal fields "${a.name ?? a.type}" and "${b.name ?? b.type}" have only ${gap}px vertical gap — ` +
            `use at least 20px on ToolJet's 10px vertical grid.`
        );
      }
    }
  }

  for (const modal of components.filter((component) => component.type === 'ModalV2' || component.type === 'Modal')) {
    const key = componentKey(modal);
    if (!key) continue;
    const children = modalChildren.filter((child) => (child.parentRef ?? child.parent) === key);
    const childBottoms = children.flatMap((child) => {
      const rect = child.layouts?.desktop ?? child.layout;
      return rect ? [{ child, bottom: (rect.top ?? 0) + renderedHeight(child, rect) }] : [];
    });
    if (!childBottoms.length) continue;

    const lowest = childBottoms.reduce((current, candidate) => candidate.bottom > current.bottom ? candidate : current);
    const modalHeight = staticNumber(propVal(modal.properties, 'modalHeight'), 400);
    const isV2 = modal.type === 'ModalV2';
    const headerHeight = !isV2 || isFalseBinding(propVal(modal.properties, 'showHeader'))
      ? 0
      : staticNumber(propVal(modal.properties, 'headerHeight'), 80);
    const footerHeight = !isV2 || isFalseBinding(propVal(modal.properties, 'showFooter'))
      ? 0
      : staticNumber(propVal(modal.properties, 'footerHeight'), 80);
    const bottomSlack = 20;
    const requiredHeight = lowest.bottom + headerHeight + footerHeight + bottomSlack;
    if (modalHeight < requiredHeight) {
      warnings.push(
        `Modal "${modal.name ?? modal.type}" has modalHeight ${modalHeight}px but needs at least ${requiredHeight}px ` +
          `for child "${lowest.child.name ?? lowest.child.type}" (rendered bottom ${lowest.bottom}px + ` +
          `${headerHeight}px header + ${footerHeight}px footer + ${bottomSlack}px bottom slack); ` +
          `content can be clipped or forced into unintended scrolling.`
      );
    }
  }
  return warnings;
}

/** Geometry-only checks for a complete page after creates, property edits, or layout edits. */
export function lintRenderedGeometry(components: LintComponent[]): string[] {
  return [...detectOverlaps(components), ...lintModalChildren(components)];
}

/** Lint a batch: per-component checks + overlap detection across the batch. */
export function lintComponents(components: LintComponent[]): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const c of components) {
    const r = lintComponentSpec(c);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  warnings.push(...lintRenderedGeometry(components));
  return { errors, warnings };
}

const uniq = (xs: string[]): string[] => [...new Set(xs)];

/** Whole-app structural validation over a compact app summary (post-write). Catches dangling
 *  references, ambiguous duplicate names, and bindings to non-existent queries/components, plus
 *  re-runs the per-component render lints against what actually persisted. */
export function validateAppStructure(summary: AppSummary): LintResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allComponents = summary.pages.flatMap((p) => p.components);
  const componentNames = new Set(allComponents.map((c) => c.name).filter(Boolean) as string[]);
  const componentIds = new Set(allComponents.map((c) => c.id));
  const queryNames = new Set(summary.queries.map((q) => q.name).filter(Boolean) as string[]);
  const queryIds = new Set(summary.queries.map((q) => q.id));
  const pageIds = new Set(summary.pages.map((p) => p.id));

  // Duplicate component names within a page (ambiguous {{components.X}}).
  for (const p of summary.pages) {
    // ToolJet renders IconHome2 for the native Home page even when its stored icon is empty. API
    // summaries are not guaranteed to return pages in creation order, so identify Home by its
    // stable handle/name rather than array position. Every other icon-less page falls back to
    // IconFile, which makes multi-page sidebar navigation look unfinished.
    const isNativeHome = p.handle === 'home' || p.name === 'Home';
    if (!isNativeHome && !p.icon) {
      warnings.push(
        `Page "${p.name ?? p.id}" has no icon — set a relevant Tabler icon so the left sidebar does not use generic IconFile.`
      );
    }
    const counts = new Map<string, number>();
    for (const c of p.components) if (c.name) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
    for (const [name, n] of counts) {
      if (n > 1) warnings.push(`Page "${p.name}": ${n} components named "${name}" — {{components.${name}}} is ambiguous.`);
    }
  }
  // Duplicate query names (ambiguous {{queries.X}}).
  {
    const counts = new Map<string, number>();
    for (const q of summary.queries) if (q.name) counts.set(q.name, (counts.get(q.name) ?? 0) + 1);
    for (const [name, n] of counts) {
      if (n > 1) warnings.push(`${n} queries named "${name}" — {{queries.${name}}} is ambiguous.`);
    }
  }

  // Dangling event references.
  for (const e of summary.events) {
    const name = e.name ?? e.id;
    const validSources =
      e.target === 'data_query'
        ? queryIds
        : e.target === 'page'
          ? pageIds
          : e.target === 'component' || e.target === 'table_column' || e.target === 'table_action'
            ? componentIds
            : new Set([...componentIds, ...queryIds, ...pageIds]);
    if (e.sourceId && !validSources.has(e.sourceId)) {
      errors.push(`Event "${name}" is attached to a source (${e.sourceId}) that no longer exists.`);
    }
    const ev = (e.event ?? {}) as Record<string, unknown>;
    if (ev.actionId === 'run-query' && typeof ev.queryId === 'string' && !queryIds.has(ev.queryId)) {
      errors.push(`Event "${name}" runs a query (${ev.queryId}) that no longer exists.`);
    }
  }

  // Bindings to non-existent queries/components + re-run per-component render lints.
  for (const c of allComponents) {
    const blob = JSON.stringify({ p: c.properties ?? {}, s: c.styles ?? {} });
    for (const m of blob.matchAll(/\{\{\s*queries\.([A-Za-z0-9_]+)/g)) {
      if (!queryNames.has(m[1])) {
        warnings.push(`Component "${c.name ?? c.id}" binds {{queries.${m[1]}…}} but no query is named "${m[1]}".`);
      }
    }
    for (const m of blob.matchAll(/\{\{\s*components\.([A-Za-z0-9_]+)/g)) {
      if (!componentNames.has(m[1])) {
        warnings.push(`Component "${c.name ?? c.id}" binds {{components.${m[1]}…}} but no component is named "${m[1]}".`);
      }
    }
    const r = lintComponentSpec({
      id: c.id,
      name: c.name ?? c.id,
      type: c.type,
      properties: c.properties,
      styles: c.styles,
      layouts: c.layouts as LintComponent['layouts'],
      parent: c.parent,
    });
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }

  const eventsBySource = new Map<string, Set<string>>();
  for (const event of summary.events) {
    if (!event.sourceId || event.target !== 'component') continue;
    const trigger = (event.event as Record<string, unknown> | undefined)?.eventId;
    if (typeof trigger !== 'string') continue;
    const triggers = eventsBySource.get(event.sourceId) ?? new Set<string>();
    triggers.add(trigger);
    eventsBySource.set(event.sourceId, triggers);
  }
  for (const table of allComponents.filter((component) => component.type === 'Table')) {
    const triggers = eventsBySource.get(table.id) ?? new Set<string>();
    const requirements: Array<[string, string]> = [
      ['serverSidePagination', 'onPageChanged'],
      ['serverSideSearch', 'onSearch'],
      ['serverSideSort', 'onSort'],
      ['serverSideFilter', 'onFilterChanged'],
    ];
    for (const [property, trigger] of requirements) {
      if (isTruthyBinding(propVal(table.properties, property)) && !triggers.has(trigger)) {
        warnings.push(`Table "${table.name ?? table.id}": ${property} is enabled but no ${trigger} event refreshes its data query.`);
      }
    }

    const tableColumnRefs = new Set(
      summary.events
        .filter((event) => event.sourceId === table.id && event.target === 'table_column')
        .map((event) => (event.event as Record<string, unknown> | undefined)?.ref)
        .filter((ref): ref is string => typeof ref === 'string')
    );
    const columns = propVal(table.properties, 'columns');
    if (Array.isArray(columns)) {
      columns.forEach((column, columnIndex) => {
        const col = column as Record<string, unknown> | null;
        if (col?.columnType !== 'button' || col.useDynamicColumn === true || !Array.isArray(col.buttons)) return;
        const columnKey = col.key ?? col.name;
        if (typeof columnKey !== 'string') return;
        col.buttons.forEach((button, buttonIndex) => {
          const b = button as Record<string, unknown> | null;
          if (Array.isArray(b?.events) && b.events.length > 0) return;
          if (typeof b?.id !== 'string') return;
          const ref = `${columnKey}::${b.id}`;
          if (!tableColumnRefs.has(ref)) {
            warnings.push(
              `Table "${table.name ?? table.id}" column[${columnIndex}] button[${buttonIndex}] has no ` +
                `table_column onClick event with ref "${ref}".`
            );
          }
        });
      });
    }
  }

  for (const p of summary.pages) warnings.push(...lintRenderedGeometry(p.components as LintComponent[]));

  return { errors: uniq(errors), warnings: uniq(warnings) };
}
