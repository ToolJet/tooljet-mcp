import { getComponentSchema, type ComponentDefaultChild } from './catalog.js';
import type { ComponentLayout, ComponentSpec } from './tooljetClient.js';

// Most ToolJet containers can be useful without their editor-supplied sample children. Kanban is
// different: its card body is a nested canvas, so valid column/card data renders blank cards when
// no child is present. Keep this allowlist intentionally narrow to avoid unnecessary nesting.
const AUTO_MATERIALIZE_DEFAULTS = new Set(['Kanban']);
const TOOLJET_DESKTOP_GRID_COLUMNS = 43;

export interface DefaultChildrenExpansion {
  components: ComponentSpec[];
  warnings: string[];
  materializedChildren: number;
}

function wrappedValues(keys: string[] | undefined, defaults: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!keys?.length) return undefined;
  return Object.fromEntries(keys.map((key) => [key, { value: defaults[key] ?? '' }]));
}

function childLayout(child: ComponentDefaultChild): ComponentLayout {
  const schema = getComponentSchema(child.componentName);
  return {
    top: child.layout?.top ?? 0,
    left: child.layout?.left ?? 0,
    width: child.layout?.width ?? ((schema?.defaultSize?.width ?? 1) * 100) / TOOLJET_DESKTOP_GRID_COLUMNS,
    height: child.layout?.height ?? schema?.defaultSize?.height ?? 40,
  };
}

function childName(parentName: string, child: ComponentDefaultChild, index: number): string {
  const cardField = Object.values(child.defaultValue ?? {})
    .find((value): value is string => typeof value === 'string')
    ?.match(/cardData\.([A-Za-z0-9_]+)/)?.[1];
  const baseRole = cardField ?? child.accessorKey ?? child.componentName;
  const role = baseRole.charAt(0).toUpperCase() + baseRole.slice(1) + (cardField ? '' : index + 1);
  return `${parentName}Card${role}`;
}

function unusedInternalRef(used: Set<string>, index: number): string {
  let suffix = index + 1;
  let ref = `__mcp_default_parent_${suffix}`;
  while (used.has(ref)) ref = `__mcp_default_parent_${++suffix}`;
  used.add(ref);
  return ref;
}

/** Materialize only defaults required for a component to render meaningful content.
 * Explicit same-batch children always win, allowing callers to author a custom card body. */
export function materializeRequiredDefaultChildren(input: ComponentSpec[]): DefaultChildrenExpansion {
  const usedRefs = new Set(input.flatMap((component) => component.clientRef ? [component.clientRef] : []));
  const explicitParentRefs = new Set(input.flatMap((component) => component.parentRef ? [component.parentRef] : []));
  const components: ComponentSpec[] = [];
  const warnings: string[] = [];
  let materializedChildren = 0;

  input.forEach((original, componentIndex) => {
    if (!AUTO_MATERIALIZE_DEFAULTS.has(original.type)) {
      components.push(original);
      return;
    }

    const schema = getComponentSchema(original.type);
    const defaults = schema?.defaultChildren ?? [];
    if (!defaults.length || (original.clientRef && explicitParentRefs.has(original.clientRef))) {
      components.push(original);
      return;
    }

    const clientRef = original.clientRef ?? unusedInternalRef(usedRefs, componentIndex);
    components.push({ ...original, clientRef });
    defaults.forEach((child, childIndex) => {
      const defaultValue = child.defaultValue ?? {};
      components.push({
        name: childName(original.name, child, childIndex),
        type: child.componentName,
        properties: wrappedValues(child.properties, defaultValue) ?? {},
        styles: wrappedValues(child.styles, defaultValue),
        layout: childLayout(child),
        parentRef: clientRef,
      });
    });
    materializedChildren += defaults.length;
    warnings.push(
      `Kanban "${original.name}" had no explicit card children; materialized ${defaults.length} catalog default ` +
        `children so cards render content. For wrapped multi-line card text, use add_components with a Kanban ` +
        `client_ref and an explicit Html child using the matching parent_ref.`
    );
  });

  return { components, warnings, materializedChildren };
}
