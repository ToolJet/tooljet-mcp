import { describe, expect, it } from 'vitest';
import moment from 'moment';
import { resolveStaticBindings } from '../src/staticBindings.js';

// A vet-clinic build, 2026-09-23: the model replaced a hard-coded date filter with
// {{moment().format('YYYY-MM-DD')}}. run_queries sent empty resolvedOptions, ToolJet resolved every
// {{...}} to undefined, and the model concluded the filter was broken and moved date filtering into
// four component bindings. ToolJet's editor sends these resolved values; do the same for bindings that
// read no live app state.
describe('resolveStaticBindings', () => {
  const today = moment().format('YYYY-MM-DD');
  const options = {
    operation: 'list_rows',
    list_rows: { where_filters: {
      a: { column: 'appointment_date', operator: 'gte', value: "{{moment().format('YYYY-MM-DD')}}" },
      b: { column: 'appointment_date', operator: 'lt', value: "{{moment().add(1,'days').format('YYYY-MM-DD')}}" },
      c: { column: 'owner', operator: 'eq', value: '{{components.search.value}}' },
    } },
    note: 'Seen on {{moment().format("YYYY-MM-DD")}} by {{Math.max(1, 2)}}',
    multi: "{{moment()\n.format('YYYY')}}",
  };

  it('evaluates bindings that use only moment, Date, Math and JSON, keyed the way ToolJet looks them up', () => {
    const { resolved } = resolveStaticBindings(options);
    expect(resolved["{{moment().format('YYYY-MM-DD')}}"]).toBe(today);
    expect(resolved["{{moment().add(1,'days').format('YYYY-MM-DD')}}"]).toBe(moment().add(1, 'days').format('YYYY-MM-DD'));
    expect(resolved['Seen on {{moment().format("YYYY-MM-DD")}} by {{Math.max(1, 2)}}']).toBe(`Seen on ${today} by 2`);
    expect(resolved["{{moment() .format('YYYY')}}"]).toBe(moment().format('YYYY'));
  });

  it('leaves live-state bindings unresolved and names them', () => {
    const { resolved, unresolved } = resolveStaticBindings(options);
    expect('{{components.search.value}}' in resolved).toBe(false);
    expect(unresolved).toEqual(['{{components.search.value}}']);
  });

  it('never runs anything else', () => {
    const { resolved, unresolved } = resolveStaticBindings({
      x: '{{process.exit(1)}}', y: '{{require("fs")}}', z: '{{globalThis}}',
      a: "{{moment.constructor.constructor('return process')()}}", b: "{{moment['constructor']}}",
      c: '{{Math.max.call.constructor}}', d: '{{(() => 1)()}}',
    });
    expect(resolved).toEqual({});
    expect(unresolved).toHaveLength(7);
  });
});

import { vi } from 'vitest';
import { runQueriesTool } from '../src/tools/runQueries.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

describe('run_queries sends resolved date bindings', () => {
  it('passes moment() filter values to ToolJet', async () => {
    const query = { id: 'q1', name: 'q_today', kind: 'tooljetdb', options: { operation: 'list_rows', table_id: 't1',
      list_rows: { limit: 50, where_filters: { a: { column: 'd', operator: 'gte', value: "{{moment().format('YYYY-MM-DD')}}" } } } } };
    const client = {
      getQueries: vi.fn().mockResolvedValue([query]),
      getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env1'),
      runQuery: vi.fn().mockResolvedValue({ status: 'ok', data: [{ id: 1 }] }),
    } as unknown as ToolJetClient;
    const result = await runQueriesTool(client).handler({ version_id: 'v1', query_ids: ['q1'] } as never);
    expect(result.isError).not.toBe(true);
    expect((client.runQuery as ReturnType<typeof vi.fn>).mock.calls[0]![0].resolvedOptions).toEqual({
      "{{moment().format('YYYY-MM-DD')}}": moment().format('YYYY-MM-DD'),
    });
  });
});

// Codex review of e6ad0d8: {{delete Math.floor}} passed and removed the host's Math.floor, because the
// context shared host built-ins. Built-ins now come from the sandbox realm, and only a narrow set of
// expression forms is evaluated at all.
describe('static bindings cannot touch the host', () => {
  it('rejects delete, assignment and mutating moment statics, and the host is unchanged', () => {
    const floor = Math.floor;
    const fmt = moment.fn.format;
    const { resolved, unresolved } = resolveStaticBindings({
      a: '{{delete Math.floor}}', b: '{{Math.floor = null}}', c: "{{moment.locale('fr')}}",
      d: "{{moment.updateLocale('en', {})}}", e: '{{moment.fn}}', f: '{{delete moment().format}}',
      g: '{{new Date(0).setTime(5)}}', h: '{{JSON.parse("1")}}',
    });
    expect(Math.floor).toBe(floor);
    expect(moment.fn.format).toBe(fmt);
    expect(moment.locale()).toBe('en');
    expect(Object.keys(resolved)).toEqual([]);
    expect(unresolved).toHaveLength(8);
  });

  it('still resolves the date forms queries use', () => {
    const { resolved } = resolveStaticBindings({ a: "{{moment.utc().startOf('day').toISOString()}}", b: "{{moment().subtract(30, 'days').format('YYYY-MM-DD')}}" });
    expect(Object.keys(resolved)).toHaveLength(2);
  });
});

// Codex review of 0b5e7e0: [moment][0].updateLocale(...) reached the host moment through an array
// literal and changed the MCP process's locale; moment().creationData().locale is another route.
// Each evaluation now gets its own moment, loaded inside the sandbox.
describe('the sandbox has its own moment', () => {
  it('cannot change the host moment through any route', () => {
    const before = moment.localeData().firstDayOfWeek();
    resolveStaticBindings({
      a: "{{[moment][0].updateLocale('en', {week: {dow: 3}}).firstDayOfWeek()}}",
      b: "{{moment().creationData().locale.set({week: {dow: 4}})}}",
      c: "{{[moment][0].locale('fr')}}",
    });
    expect(moment.localeData().firstDayOfWeek()).toBe(before);
    expect(moment.locale()).toBe('en');
  });

  it('still formats dates the way the viewer does', () => {
    const { resolved } = resolveStaticBindings({ a: "{{moment().format('YYYY-MM-DD')}}", b: "{{moment('2026-09-23').add(1, 'days').format('D MMM')}}" });
    expect(resolved["{{moment().format('YYYY-MM-DD')}}"]).toBe(moment().format('YYYY-MM-DD'));
    expect(resolved["{{moment('2026-09-23').add(1, 'days').format('D MMM')}}"]).toBe('24 Sep');
  });
});

// Review of 04ec414: node:vm is not a security boundary. moment().creationData().locale
// .longDateFormat('constructor') returned a constructor whose descriptor chain reached the host
// Function, so a binding ran code in the MCP process. Bindings are now interpreted, never executed.
describe('static bindings are interpreted, not executed', () => {
  it('cannot reach the host through a string passed to a moment method', () => {
    const gadget = "{{moment().creationData().locale.longDateFormat('constructor')}}";
    const chain = "{{moment().add('constructor', 1).format('YYYY')}}";
    const { resolved, unresolved } = resolveStaticBindings({ a: gadget, b: chain, c: "{{moment().format('constructor')}}" });
    expect(gadget in resolved || chain in resolved).toBe(false);
    expect(unresolved).toContain(gadget);
    expect(unresolved).toContain(chain);
    expect((Object.prototype as Record<string, unknown>).pwned).toBeUndefined();
  });

  it('gives the server every binding of a multi-binding string under its own key', () => {
    const text = "from {{moment('2026-09-23').format('D MMM')}} to {{moment('2026-09-23').add(7, 'days').format('D MMM')}}";
    const { resolved } = resolveStaticBindings({ a: text });
    expect(resolved["{{moment('2026-09-23').format('D MMM')}}"]).toBe('23 Sep');
    expect(resolved["{{moment('2026-09-23').add(7, 'days').format('D MMM')}}"]).toBe('30 Sep');
    expect(resolved[text]).toBe('from 23 Sep to 30 Sep');
  });

  it('covers the arithmetic and formatting queries use', () => {
    const { resolved } = resolveStaticBindings({
      a: '{{Math.round(7.4) * 2 + 1}}', b: "{{`${moment('2026-09-23').year()}-Q${moment('2026-09-23').quarter()}`}}",
      c: "{{moment('2026-09-23').isBefore(moment('2026-10-01')) ? 'early' : 'late'}}", d: "{{String(5).padStart(3, '0')}}",
      e: "{{moment('2026-09-23').diff(moment('2026-09-01'), 'days')}}", f: '{{(1.5).toFixed(2)}}',
    });
    expect(Object.values(resolved)).toEqual([15, '2026-Q3', 'early', '005', 22, '1.50']);
  });
});

// Codex review of f3e7b11: supported calls must give JavaScript's answer or not be resolved at all.
describe('static bindings never bend a result', () => {
  it('matches JavaScript where it resolves, and leaves the rest unresolved', () => {
    const { resolved, unresolved } = resolveStaticBindings({
      a: '{{parseInt("0x10")}}', b: '{{parseInt("08")}}', c: '{{(1.5).toFixed(25)}}', d: '{{String(1).padStart(1001, "0")}}',
      e: '{{(1.5).toFixed(100)}}', f: '{{(1.5).toFixed(101)}}', g: '{{String(7).padStart(3, "0")}}',
    });
    expect(resolved['{{parseInt("0x10")}}']).toBe(16);
    expect(resolved['{{parseInt("08")}}']).toBe(8);
    expect(resolved['{{(1.5).toFixed(25)}}']).toBe((1.5).toFixed(25));
    expect(resolved['{{(1.5).toFixed(100)}}']).toBe((1.5).toFixed(100));
    expect(resolved['{{String(7).padStart(3, "0")}}']).toBe('007');
    expect(unresolved).toEqual(['{{String(1).padStart(1001, "0")}}', '{{(1.5).toFixed(101)}}']);
  });
});

// ds-refresh d5 (2026-09-26): a Postgres query's :asset_search came from a search box. Outside the viewer the box has no
// value, the binding reached ToolJet unresolved, and it refused "Undefined binding(s) detected for keys [asset_search]":
// the build saw its own working query fail.
describe('a query parameter bound to a component, run outside the viewer', () => {
  it('runs as null, with a note', async () => {
    const query = { id: 'q2', name: 'assetPicker', kind: 'postgresql', options: { mode: 'sql', query: 'SELECT id FROM assets WHERE (CAST(:s AS text) IS NULL OR tag = :s) LIMIT 20',
      query_params: [['s', '{{ (components.assetTagSearch?.value || "") ?? null }}']] } };
    const client = {
      getQueries: vi.fn().mockResolvedValue([query]),
      getDevelopmentEnvironmentId: vi.fn().mockResolvedValue('env1'),
      runQuery: vi.fn().mockResolvedValue({ status: 'ok', data: [{ id: 1 }] }),
    } as unknown as ToolJetClient;
    const result = await runQueriesTool(client).handler({ version_id: 'v1', query_ids: ['q2'] } as never);
    expect((client.runQuery as ReturnType<typeof vi.fn>).mock.calls[0]![0].resolvedOptions)
      .toEqual({ '{{ (components.assetTagSearch?.value || "") ?? null }}': null });
    expect(JSON.stringify(result)).toMatch(/:s[\s\S]*null/);
  });
});
