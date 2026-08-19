/** Query-option schemas compiled from ToolJet's core + marketplace plugin definitions. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export interface DatasourceQuerySchema {
  kind: string;
  name: string;
  type?: string;
  description?: string;
  defaults: Record<string, unknown>;
  operations: string[];
  properties: Record<string, unknown>;
  contracts: Record<string, DatasourceOperationContract>;
  introspectionMethods?: string[];
  sources?: Array<{ collection: string; package: string }>;
  paginationStrategies?: string[];
}

export interface DatasourceFieldContract {
  path: string;
  type: string;
  label?: string;
  description?: string;
  required?: boolean;
  allowedValues?: string[];
  shape?: Record<string, unknown>;
  example?: unknown;
}

export interface DatasourceContractVariant {
  when: Record<string, string[]>;
  fields: Record<string, DatasourceFieldContract>;
  required: string[];
}

export interface DatasourceResponseContract {
  type: string;
  status: 'known' | 'runtime-dependent' | 'unknown';
  source: string;
  description?: string;
  shape?: Record<string, unknown>;
  metadata?: {
    status: 'known' | 'runtime-dependent' | 'unknown';
    description?: string;
    shape?: Record<string, unknown>;
  };
}

export interface DatasourceOperationContract {
  operation: string;
  variants: DatasourceContractVariant[];
  response?: DatasourceResponseContract;
  notes?: string[];
}

export const COMMON_QUERY_OPTION_FIELDS: Record<string, DatasourceFieldContract> = {
  runOnPageLoad: { path: 'runOnPageLoad', type: 'boolean|binding', description: 'Run when the app first loads.' },
  runOnDependencyChange: { path: 'runOnDependencyChange', type: 'boolean|binding' },
  requestConfirmation: { path: 'requestConfirmation', type: 'boolean|binding' },
  requestConfirmationFx: { path: 'requestConfirmationFx', type: 'boolean' },
  confirmationMessage: { path: 'confirmationMessage', type: 'string|binding' },
  showSuccessNotification: { path: 'showSuccessNotification', type: 'boolean|binding' },
  successMessage: { path: 'successMessage', type: 'string|binding' },
  notificationDuration: { path: 'notificationDuration', type: 'number|string' },
  enableTransformation: { path: 'enableTransformation', type: 'boolean' },
  transformationLanguage: { path: 'transformationLanguage', type: 'string', allowedValues: ['javascript', 'python'] },
  transformations: { path: 'transformations', type: 'object' },
  transformation: { path: 'transformation', type: 'string' },
  query_timeout: { path: 'query_timeout', type: 'number|string' },
  disableQuery: { path: 'disableQuery', type: 'boolean|binding' },
  disabledMessage: { path: 'disabledMessage', type: 'string|binding' },
};

export type DatasourceSchemaSection = 'summary' | 'request' | 'response' | 'raw' | 'introspection';

const dataPath = resolve(dirname(fileURLToPath(import.meta.url)), '../data/datasource-schemas.json');
let cache: Record<string, DatasourceQuerySchema> | null = null;

function load(): Record<string, DatasourceQuerySchema> {
  if (!cache) cache = JSON.parse(readFileSync(dataPath, 'utf8')) as Record<string, DatasourceQuerySchema>;
  return cache;
}

export function getDatasourceCatalog(): Array<Pick<DatasourceQuerySchema, 'kind' | 'name' | 'type' | 'operations'>> {
  return Object.values(load()).map(({ kind, name, type, operations }) => ({ kind, name, type, operations }));
}

export function getDatasourceQuerySchema(kind: string): DatasourceQuerySchema | null {
  return load()[kind] ?? null;
}

function operationSummary(contract: DatasourceOperationContract): Record<string, unknown> {
  const selectors: Record<string, Set<string>> = {};
  const required = new Set<string>();
  for (const variant of contract.variants) {
    variant.required.forEach((path) => required.add(path));
    for (const [key, values] of Object.entries(variant.when)) {
      const collected = selectors[key] ?? new Set<string>();
      values.forEach((value) => collected.add(value));
      selectors[key] = collected;
    }
  }
  return {
    operation: contract.operation,
    selectors: Object.fromEntries(
      Object.entries(selectors).map(([key, values]) => [key, [...values].sort()])
    ),
    required: [...required].sort(),
    variants: contract.variants.length,
    ...(contract.response ? { response_type: contract.response.type } : {}),
    ...(contract.response ? { response_status: contract.response.status } : {}),
  };
}

export function selectDatasourceQuerySchema(
  kind: string,
  options: { operation?: string; sections?: DatasourceSchemaSection[] } = {}
): Record<string, unknown> | null {
  const schema = getDatasourceQuerySchema(kind);
  if (!schema) return null;
  const sections = new Set(
    options.sections ?? (options.operation ? ['summary', 'request', 'response'] : ['summary'])
  );
  const result: Record<string, unknown> = {};

  if (sections.has('summary')) {
    Object.assign(result, {
      kind: schema.kind,
      name: schema.name,
      type: schema.type,
      description: schema.description,
      defaults: schema.defaults,
      operations: schema.operations,
    });
    if (!options.operation) {
      result.operation_summaries = Object.values(schema.contracts).map(operationSummary);
    }
  }

  if (options.operation) {
    const contract = schema.contracts[options.operation];
    if (!contract) {
      return {
        kind,
        error: `Unknown operation "${options.operation}" for datasource kind "${kind}".`,
        operations: schema.operations,
      };
    }
    if (sections.has('request')) {
      result.request = {
        operation: contract.operation,
        variants: contract.variants,
        common_fields: COMMON_QUERY_OPTION_FIELDS,
        ...(contract.notes ? { notes: contract.notes } : {}),
      };
    }
    if (sections.has('response')) {
      result.response = contract.response ?? {
        type: 'unknown',
        status: 'unknown',
        source: 'tooljet-plugin',
        description: 'This plugin does not publish a stable response contract. Run a safe read query and inspect data.',
      };
    }
  }

  if (sections.has('raw')) {
    result.raw = { properties: schema.properties, sources: schema.sources };
  }
  if (sections.has('introspection')) {
    result.introspection_methods = schema.introspectionMethods ?? [];
  }
  return result;
}
