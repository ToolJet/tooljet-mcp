import { getDatasourceQuerySchema } from './datasourceCatalog.js';

/** Match the keys returned by ToolJet's humps.decamelizeKeys serializer. These keys select
 * the editor's spec; using the display label makes the editor reset operation/path to null. */
export function hubspotSpecs() {
  return (getDatasourceQuerySchema('hubspot')?.operationSelection?.specs ?? [])
    .filter((spec) => spec.location === 'bundled' && spec.plugin === 'hubspot' && spec.name && spec.label)
    .map((spec) => ({
      name: spec.name!, label: spec.label!,
      specType: spec.label!.split(/(?=[A-Z])/).join('_').toLowerCase(),
    }));
}

export function hubspotQueryIssues(options: Record<string, unknown>): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = [];
  const issue = (path: string, message: string) => issues.push({ path, message });
  const record = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);
  if (!['get', 'post', 'patch', 'put', 'delete'].includes(String(options.operation))) {
    issue('operation', 'HubSpot operation must be a lowercase HTTP method from getEndpointSchema, not an object name or create/update action.');
  }
  if (typeof options.path !== 'string' || !/^\/(?!\/)[^\s?#]*$/.test(options.path) || options.path.includes('{{')) {
    issue('path', 'HubSpot needs the static endpoint path returned by getEndpointSchema; put record IDs in params.path.');
  }
  if (!hubspotSpecs().some((spec) => spec.specType === options.specType)) {
    issue('specType', 'Use the exact specType returned by inspect_datasource_schema so the HubSpot editor retains the selected endpoint.');
  }
  for (const bucket of ['path', 'query', 'request']) {
    if (!record(options.params) || !record(options.params[bucket])) {
      issue(`params.${bucket}`, `HubSpot requires params.${bucket} as an object; use {} when empty.`);
    }
  }
  for (const misplaced of ['objectId', 'properties']) {
    if (misplaced in options) issue(misplaced, `HubSpot ignores top-level ${misplaced}; use params.path for IDs and params.request for the JSON body.`);
  }
  if (typeof options.path === 'string' && record(options.params) && record(options.params.path)) {
    for (const match of options.path.matchAll(/\{([^{}]+)\}/g)) {
      const value = options.params.path[match[1]!];
      if (value === undefined || value === null || value === '') issue(`params.path.${match[1]}`, 'Provide a value for every endpoint path placeholder.');
    }
  }
  return issues;
}
