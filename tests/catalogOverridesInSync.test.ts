import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* data/datasource-schemas.json is GENERATED from data/datasource-contract-overrides.json by
 * scripts/generate-datasource-catalog.mjs, and the generated file is the one the server serves.
 * Editing the overrides without regenerating therefore changes nothing at runtime, silently: two
 * real builds were shipped guidance that had been corrected days earlier, and the cause took three
 * traces to find because rebuilding the bundle looks like it should fix it (the catalog is not in
 * the bundle).
 *
 * Regenerating needs a ToolJet checkout, so this cannot regenerate and diff. It instead asserts
 * that what the overrides say is what the catalog serves — which is the part that goes stale. */

const dataDir = resolve(__dirname, '../data');
const read = (name: string) => JSON.parse(readFileSync(resolve(dataDir, name), 'utf8'));
const overrides: Record<string, any> = read('datasource-contract-overrides.json');
const catalog: Record<string, any> = read('datasource-schemas.json');

const STALE = 'Run: TOOLJET_ROOT=<tooljet checkout> node scripts/generate-datasource-catalog.mjs';

describe('generated datasource catalog is in sync with the hand-authored overrides', () => {
  it('covers every overridden kind', () => {
    for (const kind of Object.keys(overrides)) {
      expect(catalog[kind], `${kind} missing from datasource-schemas.json. ${STALE}`).toBeDefined();
    }
  });

  /* Flattened rather than a describe-per-kind: several overrides carry only response metadata and
     would produce an empty suite, which vitest treats as a failure. */
  const cases: Array<[string, () => void]> = [];

  for (const [kind, override] of Object.entries<any>(overrides)) {
    const entry = catalog[kind];
    if (!entry) continue;

    if (override.introspection_methods) {
      cases.push([`${kind}: introspection methods`, () => {
        expect([...(entry.introspectionMethods ?? [])].sort(), STALE)
          .toEqual([...override.introspection_methods].sort());
      }]);
    }

    for (const [operation, contract] of Object.entries<any>(override.operations ?? {})) {
      // Some overrides describe an operation the harvest expresses under a different contract key;
      // only assert on the ones actually served, so this guards staleness without duplicating the
      // generator's mapping rules.
      const served = entry.contracts?.[operation]?.variants?.[0];
      if (!served) continue;

      if (contract.required) {
        cases.push([`${kind}/${operation}: required options`, () => {
          expect([...(served.required ?? [])].sort(), STALE).toEqual([...contract.required].sort());
        }]);
      }

      if (contract.fields && Object.keys(contract.fields).length) {
        cases.push([`${kind}/${operation}: field descriptions and allowed values`, () => {
          for (const [path, field] of Object.entries<any>(contract.fields)) {
            const servedField = served.fields?.[path];
            expect(servedField, `${kind}/${operation} field "${path}" is not served. ${STALE}`).toBeDefined();
            if (field.description) {
              expect(servedField.description, `${kind}/${operation}.${path} description is stale. ${STALE}`)
                .toBe(field.description);
            }
            if (field.allowedValues) {
              expect(servedField.allowedValues, `${kind}/${operation}.${path} allowedValues are stale. ${STALE}`)
                .toEqual(field.allowedValues);
            }
          }
        }]);
      }
    }
  }

  /* A guard on the guard: if the override->catalog mapping ever changes shape, `cases` could
     quietly become empty and this file would pass while checking nothing. Name the case that the
     stale-catalog incident actually turned on. */
  it('is actually checking the overrides it claims to', () => {
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.map(([name]) => name)).toContain('openapi/default: required options');
    expect(cases.map(([name]) => name)).toContain('openapi: introspection methods');
  });
  for (const [name, assertion] of cases) it(name, assertion);
});
