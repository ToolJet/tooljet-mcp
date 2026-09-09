import { describe, it, expect } from 'vitest';
import {
  extractSpec, listEndpoints, endpointParameters, specHost, rankEndpoints, endpointTagCounts,
} from '../src/openapiSpec.js';
import { validateQueryOptions } from '../src/queryValidation.js';
import { getDatasourceQuerySchema } from '../src/datasourceCatalog.js';

const spec = {
  openapi: '3.0.0',
  paths: {
    '/pets': {
      parameters: [{ name: 'tenant', in: 'header', required: true, schema: { type: 'string' } }],
      get: {
        operationId: 'listPets',
        summary: 'List pets',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['available', 'sold'] } },
          { $ref: '#/components/parameters/Limit' },
        ],
      },
      post: {
        operationId: 'createPet',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } } },
      },
    },
    '/pets/{petId}': {
      get: { operationId: 'getPet', parameters: [{ name: 'petId', in: 'path', schema: { type: 'integer' } }] },
      delete: { operationId: 'deletePet', deprecated: true },
    },
  },
  components: {
    parameters: { Limit: { name: 'limit', in: 'query', schema: { type: 'integer' } } },
    schemas: { Pet: { type: 'object', properties: { name: { type: 'string' } } } },
  },
};

describe('reading the stored spec', () => {
  it('unwraps the ToolJet option envelope, a bare object, and a JSON string', () => {
    expect(extractSpec({ spec: { value: spec } })?.openapi).toBe('3.0.0');
    expect(extractSpec({ spec })?.openapi).toBe('3.0.0');
    expect(extractSpec({ spec: JSON.stringify(spec) })?.openapi).toBe('3.0.0');
  });

  it('returns nothing for a missing or unparseable spec rather than throwing', () => {
    expect(extractSpec({})).toBeUndefined();
    expect(extractSpec({ spec: 'not json' })).toBeUndefined();
  });
});

describe('endpoint discovery', () => {
  it('lists every path/method pair with its operationId', () => {
    const endpoints = listEndpoints(spec);
    expect(endpoints).toHaveLength(4);
    expect(endpoints).toContainEqual({ path: '/pets', method: 'get', operationId: 'listPets', summary: 'List pets' });
    expect(endpoints.find((e) => e.method === 'delete')?.deprecated).toBe(true);
  });

  it('ignores non-method keys on a path item', () => {
    /* `parameters` sits beside the methods on a path item and is not an endpoint. */
    expect(listEndpoints(spec).some((e) => e.method === 'parameters')).toBe(false);
  });
});

describe('endpoint parameters', () => {
  it('merges path-level and operation-level parameters', () => {
    const { parameters } = endpointParameters(spec, '/pets', 'get');
    expect(parameters.map((p) => p.name).sort()).toEqual(['limit', 'status', 'tenant']);
  });

  it('resolves a $ref parameter', () => {
    const limit = endpointParameters(spec, '/pets', 'get').parameters.find((p) => p.name === 'limit');
    expect(limit).toMatchObject({ in: 'query', type: 'integer' });
  });

  it('treats a path parameter as required even when the spec omits required', () => {
    const petId = endpointParameters(spec, '/pets/{petId}', 'get').parameters.find((p) => p.name === 'petId');
    expect(petId?.required).toBe(true);
  });

  it('carries enum values through', () => {
    const status = endpointParameters(spec, '/pets', 'get').parameters.find((p) => p.name === 'status');
    expect(status?.enum).toEqual(['available', 'sold']);
  });

  it('resolves a $ref request body schema', () => {
    const { requestBody } = endpointParameters(spec, '/pets', 'post');
    expect(requestBody?.required).toBe(true);
    expect(requestBody?.schema).toMatchObject({ type: 'object' });
  });

  it('reports a path/method the spec does not define', () => {
    expect(endpointParameters(spec, '/pets', 'put').found).toBe(false);
    expect(endpointParameters(spec, '/nope', 'get').found).toBe(false);
  });

  it('reads Swagger 2 parameters, where the type sits on the parameter itself', () => {
    const swagger = { swagger: '2.0', paths: { '/x': { get: { parameters: [{ name: 'q', in: 'query', type: 'string' }] } } } };
    expect(endpointParameters(swagger, '/x', 'get').parameters[0]).toMatchObject({ name: 'q', type: 'string' });
  });

  it('survives a self-referential $ref instead of recursing forever', () => {
    const looped = { paths: { '/x': { get: { parameters: [{ $ref: '#/components/parameters/Loop' }] } } },
      components: { parameters: { Loop: { $ref: '#/components/parameters/Loop' } } } };
    expect(() => endpointParameters(looped, '/x', 'get')).not.toThrow();
  });
});

describe('openapi query contract', () => {
  it('is published with the fields the plugin actually reads', () => {
    const schema = getDatasourceQuerySchema('openapi');
    const fields = Object.keys(schema!.contracts.default!.variants[0]!.fields);
    expect(fields).toEqual(expect.arrayContaining([
      'host', 'path', 'operation', 'params.request', 'params.query', 'params.header', 'params.path',
    ]));
    expect(schema!.introspectionMethods).toEqual(['listTables', 'getEndpointSchema']);
  });

  it('accepts a well-formed openapi query', () => {
    const result = validateQueryOptions('openapi', {
      host: 'https://api.example.com', path: '/pets/{petId}', operation: 'get',
      params: { request: {}, query: { verbose: 'true' }, header: {}, path: { petId: '42' } },
    });
    expect(result.errors).toEqual([]);
  });

  it('flags an omitted param bucket, which the plugin reads unguarded', () => {
    const result = validateQueryOptions('openapi', {
      host: 'https://api.example.com', path: '/pets', operation: 'get', params: { query: {} },
    });
    expect(result.errors.map((error) => error.path).sort())
      .toEqual(['params.header', 'params.path', 'params.request']);
  });

  it('flags a missing host, which fails at runtime with "Invalid URL"', () => {
    const result = validateQueryOptions('openapi', {
      path: '/pets', operation: 'get', params: { request: {}, query: {}, header: {}, path: {} },
    });
    expect(result.errors.map((error) => error.path)).toEqual(['host']);
  });

  it('flags a query missing the required path/operation', () => {
    const result = validateQueryOptions('openapi', { params: { query: {} } });
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('specHost', () => {
  it('reads servers[0].url and strips the trailing slash', () => {
    expect(specHost({ servers: [{ url: 'https://api.twelvedata.com/' }] })).toBe('https://api.twelvedata.com');
    expect(specHost({ servers: [{ url: 'https://api.example.com' }] })).toBe('https://api.example.com');
  });

  it('builds the base URL from Swagger 2 host/basePath/schemes', () => {
    expect(specHost({ host: 'api.example.com', basePath: '/v2/', schemes: ['http'] })).toBe('http://api.example.com/v2');
    expect(specHost({ host: 'api.example.com' })).toBe('https://api.example.com');
  });

  it('returns undefined when the spec declares no server', () => {
    expect(specHost({ paths: {} })).toBeUndefined();
    expect(specHost({ servers: [] })).toBeUndefined();
  });
});

describe('specHost with a relative server URL', () => {
  it('reports no host, since a relative URL cannot be resolved without an origin', () => {
    // Swagger Petstore ships exactly this.
    expect(specHost({ servers: [{ url: '/api/v3' }] })).toBeUndefined();
  });
});

describe('extractSpec with a YAML document', () => {
  const yamlSpec = `
openapi: 3.0.3
info:
  title: Weather
servers:
  - url: https://api.open-meteo.com/v1/
paths:
  /forecast:
    get:
      operationId: getForecast
      summary: Forecast
      parameters:
        - name: latitude
          in: query
          required: true
          schema: { type: number }
        - name: hourly
          in: query
          schema:
            type: array
            items: { type: string }
`;

  it('parses a YAML spec pasted as text', () => {
    const spec = extractSpec({ spec: { value: yamlSpec } })!;
    expect(spec).toBeDefined();
    expect(specHost(spec)).toBe('https://api.open-meteo.com/v1');
    expect(listEndpoints(spec)).toEqual([
      { path: '/forecast', method: 'get', operationId: 'getForecast', summary: 'Forecast' },
    ]);
    const { parameters } = endpointParameters(spec, '/forecast', 'get');
    expect(parameters).toEqual([
      { name: 'latitude', in: 'query', required: true, type: 'number' },
      { name: 'hourly', in: 'query', required: false, type: 'array<string>' },
    ]);
  });

  it('still parses JSON, and still rejects a document that is neither', () => {
    expect(extractSpec({ spec: { value: '{"paths":{}}' } })).toEqual({ paths: {} });
    expect(extractSpec({ spec: { value: '{ this is: [not, valid' } })).toBeUndefined();
  });
});

describe('extractSpec option-key fallback', () => {
  const doc = '{"openapi":"3.0.0","paths":{"/a":{"get":{}}}}';

  it('prefers spec when both keys hold a document', () => {
    const spec = extractSpec({
      spec: { value: { openapi: '3.0.0', paths: { '/fromspec': { get: {} } } } },
      definition: { value: doc },
    })!;
    expect(Object.keys(spec.paths)).toEqual(['/fromspec']);
  });

  it('falls back to definition when spec is absent', () => {
    const spec = extractSpec({ definition: { value: doc } })!;
    expect(Object.keys(spec.paths)).toEqual(['/a']);
  });

  it('skips a present-but-pathless spec in favour of a usable definition', () => {
    const spec = extractSpec({ spec: { value: '' }, definition: { value: doc } })!;
    expect(Object.keys(spec.paths)).toEqual(['/a']);
  });

  it('returns undefined when neither key holds a usable document', () => {
    expect(extractSpec({ spec: { value: '' }, definition: { value: '' } })).toBeUndefined();
  });
});

describe('rankEndpoints', () => {
  /* Shaped after the GitHub cases that drove the scoring: a canonical operation, a near-miss whose
     description merely mentions the query's words, and an unrelated one. */
  const spec: Record<string, any> = {
    paths: {
      '/repos/{owner}/{repo}/issues': {
        get: { operationId: 'issues/list', summary: 'List repository issues', tags: ['issues'] },
        post: { operationId: 'issues/create', summary: 'Create an issue', tags: ['issues'] },
      },
      '/orgs/{org}/issue-fields': {
        post: {
          operationId: 'orgs/create-issue-field',
          summary: 'Create issue field for an organization',
          tags: ['orgs'],
          description: 'Creates a new issue field for an organization.',
        },
      },
      '/orgs/{org}/actions/permissions/workflow': {
        get: {
          operationId: 'actions/get-workflow-permissions',
          summary: 'Get default workflow permissions',
          tags: ['actions'],
          description: 'Whether GitHub Actions can approve pull request reviews.',
        },
      },
      '/repos/{owner}/{repo}/pulls/{pull_number}/reviews': {
        get: { operationId: 'pulls/list-reviews', summary: 'List reviews for a pull request', tags: ['pulls'] },
      },
      '/billing/usage': { get: { operationId: 'billing/usage', summary: 'Get billing usage', tags: ['billing'] } },
    },
  };
  const endpoints = listEndpoints(spec);
  const top = (query: string) => {
    const [first] = rankEndpoints(spec, endpoints, query);
    return first && `${first.method} ${first.path}`;
  };

  it('ranks a natural-language phrase that matches no literal substring', () => {
    // The whole point: substring search returns nothing for this.
    expect(top('list open issues for a repo')).toBe('get /repos/{owner}/{repo}/issues');
  });

  it('does not let a passing mention in a description outrank the operation named by the query', () => {
    expect(top('pull request reviews')).toBe('get /repos/{owner}/{repo}/pulls/{pull_number}/reviews');
  });

  it('prefers the operation whose own name the query fully accounts for', () => {
    // Both match create+issue; only the issue-field description says "new".
    expect(top('create a new issue')).toBe('post /repos/{owner}/{repo}/issues');
  });

  it('scores descending, drops non-matches, and returns nothing for an unrelated query', () => {
    const ranked = rankEndpoints(spec, endpoints, 'issue');
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((entry) => entry.score > 0)).toBe(true);
    expect([...ranked].sort((a, b) => b.score - a.score).map((e) => e.path)).toEqual(ranked.map((e) => e.path));
    expect(ranked.some((entry) => entry.path === '/billing/usage')).toBe(false);
    expect(rankEndpoints(spec, endpoints, 'kubernetes cluster')).toEqual([]);
  });

  it('carries tags through and ignores a query of only stopwords', () => {
    expect(rankEndpoints(spec, endpoints, 'issue')[0].tags).toEqual(['issues']);
    expect(rankEndpoints(spec, endpoints, 'the a of')).toEqual([]);
  });

  it('matches across camelCase, snake_case and path-segment boundaries', () => {
    // "workflow permissions" only appears as getWorkflowPermissions / permissions/workflow.
    expect(top('workflow permissions')).toBe('get /orgs/{org}/actions/permissions/workflow');
  });
});

describe('endpointTagCounts', () => {
  const spec: Record<string, any> = {
    paths: {
      '/a': { get: { tags: ['x'] }, post: { tags: ['x', 'y'] } },
      '/b': { get: {} },
    },
  };

  it('counts operations per tag, most populous first, bucketing untagged', () => {
    expect(endpointTagCounts(spec, listEndpoints(spec))).toEqual({ x: 2, y: 1, untagged: 1 });
  });
});
