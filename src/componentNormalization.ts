import { getComponentSchema } from './catalog.js';
import type { ComponentSpec } from './tooljetClient.js';

export interface ComponentNormalization<T extends ComponentSpec = ComponentSpec> {
  component: T;
  patch: { properties?: Record<string, unknown> };
  warnings: string[];
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

function catalogDefault(key: string, fallback: unknown): unknown {
  return getComponentSchema('Table')?.properties.find((property) => property.key === key)?.default ?? fallback;
}

/** Apply small persisted-definition compatibility fixes without changing component intent. */
export function normalizeComponentSpec<T extends ComponentSpec>(component: T): ComponentNormalization<T> {
  if (component.type !== 'Table') return { component, patch: {}, warnings: [] };

  const properties = { ...component.properties };
  const propertyPatch: Record<string, unknown> = {};
  const warnings: string[] = [];
  const setProperty = (key: string, value: unknown): void => {
    const current = properties[key];
    const wrapped = current && typeof current === 'object' && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>), value }
      : { value };
    properties[key] = wrapped;
    propertyPatch[key] = wrapped;
  };

  if (properties.useDynamicColumn === undefined) {
    setProperty('useDynamicColumn', catalogDefault('useDynamicColumn', '{{false}}'));
  }
  if (properties.columnData === undefined) {
    setProperty(
      'columnData',
      catalogDefault(
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

  return {
    component: { ...component, properties } as T,
    patch: Object.keys(propertyPatch).length ? { properties: propertyPatch } : {},
    warnings,
  };
}
