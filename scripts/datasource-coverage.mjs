import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const sortedObject = (value) =>
  Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));

export function buildDatasourceCoverage(schemas) {
  const defaultOnlyKinds = [];
  const kindsWithoutContracts = [];
  const knownResponseKinds = new Set();
  const opaqueEndpointKinds = new Set();
  const unknownByKind = {};
  const responses = { known: 0, runtime_dependent: 0, unknown: 0, missing: 0 };
  let contractCount = 0;
  let namedOperationKinds = 0;

  for (const [kind, schema] of Object.entries(schemas).sort(([left], [right]) => left.localeCompare(right))) {
    if ((schema.operations || []).length > 0) namedOperationKinds += 1;
    else defaultOnlyKinds.push(kind);

    const contracts = Object.values(schema.contracts || {});
    if (!contracts.length) kindsWithoutContracts.push(kind);
    contractCount += contracts.length;

    for (const contract of contracts) {
      const status = contract.response?.status;
      if (status === 'known') {
        responses.known += 1;
        knownResponseKinds.add(kind);
      } else if (status === 'runtime-dependent') {
        responses.runtime_dependent += 1;
        unknownByKind[kind] = (unknownByKind[kind] || 0) + 1;
      } else if (status === 'unknown') {
        responses.unknown += 1;
        unknownByKind[kind] = (unknownByKind[kind] || 0) + 1;
      } else {
        responses.missing += 1;
        unknownByKind[kind] = (unknownByKind[kind] || 0) + 1;
      }

      for (const variant of contract.variants || []) {
        if (Object.values(variant.fields || {}).some((field) =>
          String(field.type || '').startsWith('react-component-api-endpoint')
        )) {
          opaqueEndpointKinds.add(kind);
        }
      }
    }
  }

  return {
    datasource_kinds: Object.keys(schemas).length,
    contract_count: contractCount,
    kinds_with_named_operations: namedOperationKinds,
    default_only_kinds: defaultOnlyKinds,
    response_contracts: {
      total: contractCount,
      ...responses,
      known_percent: contractCount ? Number(((responses.known / contractCount) * 100).toFixed(1)) : 0,
    },
    known_response_kinds: [...knownResponseKinds].sort(),
    unknown_response_contracts_by_kind: sortedObject(unknownByKind),
    opaque_endpoint_kinds: [...opaqueEndpointKinds].sort(),
    kinds_without_contracts: kindsWithoutContracts,
  };
}

function metrics(coverage) {
  return {
    datasource_kinds: coverage.datasource_kinds,
    contract_count: coverage.contract_count,
    known_response_contracts: coverage.response_contracts.known,
    response_contracts_present: coverage.contract_count - coverage.response_contracts.missing,
    missing_response_contracts: coverage.response_contracts.missing,
    kinds_without_contracts: coverage.kinds_without_contracts.length,
    opaque_endpoint_kinds: coverage.opaque_endpoint_kinds.length,
  };
}

function checkCoverage() {
  const schemaPath = resolve(root, 'data/datasource-schemas.json');
  const reportPath = resolve(root, 'data/datasource-coverage.json');
  const baselinePath = resolve(root, 'data/datasource-coverage-baseline.json');
  const schemas = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const coverage = buildDatasourceCoverage(schemas);
  const failures = [];

  if (!existsSync(reportPath)) {
    failures.push('data/datasource-coverage.json is missing; run npm run generate:catalogs.');
  } else {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    if (JSON.stringify(report) !== JSON.stringify(coverage)) {
      failures.push('data/datasource-coverage.json is stale; run npm run generate:catalogs.');
    }
  }

  if (!existsSync(baselinePath)) {
    failures.push('data/datasource-coverage-baseline.json is missing.');
  } else {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    const actual = metrics(coverage);
    for (const [key, minimum] of Object.entries(baseline.minimums || {})) {
      if (!(key in actual)) failures.push(`Unknown minimum coverage metric: ${key}.`);
      else if (actual[key] < minimum) failures.push(`${key} regressed: ${actual[key]} < ${minimum}.`);
    }
    for (const [key, maximum] of Object.entries(baseline.maximums || {})) {
      if (!(key in actual)) failures.push(`Unknown maximum coverage metric: ${key}.`);
      else if (actual[key] > maximum) failures.push(`${key} regressed: ${actual[key]} > ${maximum}.`);
    }
  }

  const response = coverage.response_contracts;
  console.log(
    `Datasource coverage: ${coverage.datasource_kinds} kinds, ${coverage.contract_count} contracts; ` +
    `${response.known} known, ${response.runtime_dependent} runtime-dependent, ${response.unknown} unknown responses; ` +
    `${coverage.opaque_endpoint_kinds.length} opaque endpoint kinds.`
  );
  if (failures.length) {
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--check')) {
  checkCoverage();
}
