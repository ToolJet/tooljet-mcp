import { describe, expect, it } from 'vitest';
import { lintPlannedApp } from '../src/appSpecLint.js';
import { validateAppStructure } from '../src/lint.js';
import type { AppSummary } from '../src/tooljetClient.js';

// QA DVRL-112 (feat/cc-packs, 2026-11-12): validate_app passed {{queries.getData.dataa}}. The query exists but has no
// "dataa", so the binding reads undefined at runtime and the widget shows nothing.

const queryId = 'd9ccffce-6d1e-4b7a-9c2f-5e8d1a4b7c30';
const app = (binding: string): AppSummary => ({
  app_id: 'a',
  name: 'Orders',
  version_id: 'v',
  events: [],
  queries: [{ id: queryId, name: 'getData', kind: 'restapi', options: {} }],
  pages: [{ id: 'p1', name: 'Home', components: [{ id: 'c1', name: 'text1', type: 'Text', properties: { text: { value: binding } } }] }],
});
const errorsOf = (binding: string) => validateAppStructure(app(binding)).errors.join(' ');

describe('a binding reads a property the query has', () => {
  it.each([
    '{{queries.getData.dataa}}',
    '{{queries.getData?.dataa}}',
    '{{queries["getData"].dataa.length}}',
    '{{(queries.getData.dataa || []).length}}',
  ])('refuses %s, naming the property meant', (binding) => {
    expect(errorsOf(binding)).toMatch(/Component "text1" reads queries\.getData\.dataa, but a query has no dataa.*Read queries\.getData\.data/);
  });

  it.each(['data', 'rawData', 'isLoading', 'error', 'metadata', 'request', 'response', 'responseHeaders', 'id'])(
    'accepts queries.getData.%s',
    (property) => {
      expect(errorsOf(`{{queries.getData.${property}}}`)).not.toMatch(/a query has no/);
    }
  );

  it.each(['{{queries.getData}}', '{{queries.getData.getData()}}', '{{queries.getData.data.rows.length}}'])(
    'accepts %s (the whole query, a method, a path inside data)',
    (binding) => {
      expect(errorsOf(binding)).not.toMatch(/a query has no/);
    }
  );

  it('leaves a query that does not exist to the missing-name report, once', () => {
    const errors = validateAppStructure(app('{{queries.nope.dataa}}')).errors;
    expect(errors.filter((e) => e.includes('nope'))).toEqual([expect.stringMatching(/no query is named "nope"/)]);
  });

  it('refuses it in an app plan too (lint_app_spec)', () => {
    const result = lintPlannedApp({
      queries: [{ name: 'getData', kind: 'restapi', options: {} }],
      pages: [
        {
          name: 'Home',
          components: [{ name: 'text1', type: 'Text', properties: { text: '{{queries.getData.dataa}}' }, layout: { top: 20, left: 2, width: 20, height: 40 } }],
        },
      ],
    } as never);
    expect(result.errors.join(' ')).toMatch(/reads queries\.getData\.dataa, but a query has no dataa/);
  });
});
