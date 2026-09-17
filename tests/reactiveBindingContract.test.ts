import { expect, it } from 'vitest';
import { lintUntrackedReactiveBindings } from '../src/reactiveBindingContract.js';

it.each([
  "{{(components['Search'] || {}).value}}",
  '{{(components.Search ?? {}).value}}',
  '{{queries.rows.data.filter(r=>r.name.includes((components.Search || {}).value))}}',
])('warns on untracked fallback %s',binding=>expect(lintUntrackedReactiveBindings(binding,'Table')).toHaveLength(1));
it.each([
  '{{components.Search ? components.Search.value : undefined}}',
  '{{components.Search?.value}}',
  "{{components['Search'].value}}",
  '{{(queries.rows.data || []).map(r=>r.name)}}',
  '{{components.Search.value && (components.Search || {}).value}}',
  '{{((components)=>(components.Search || {}).value)({})}}',
  '{{"(components.Search || {}).value"}}',
  '{{(components[variables.name] || {}).value}}',
])('does not warn on a tracked or uncertain read %s',binding=>expect(lintUntrackedReactiveBindings(binding,'Table')).toEqual([]));
