import { describe, expect, it } from 'vitest';
import { buildSummary, fixFor, formatProblems, fromChecked, parseBuildProblems } from '../src/codeTypeErrors.js';

// Real code_app_build outputs from the Code mode builds of 2026-11-04 (ANSI colours already stripped by the tool).
const QUERY_ERROR = `Building your component library...


✗ Error : TypeScript compiled (2 errors)


src/App/Tickets.tsx:261:177 - error TS2322: Type 'QueryError' is not assignable to type 'ReactNode'.

261       {tickets.error ? <Card><CardContent>{tickets.error}</CardContent></Card> : null}
                                                ~~~~~~~~~~~~~~~
src/lib/router.tsx:55:49 - error TS7006: Parameter 'route' implicitly has an 'any' type.

55   return ToolJet.useNavigation().routes.filter((route) => route.allowed);
                                                   ~~~~~

✓ Manifest generated: dist/manifest.json (1 components)
✓ Bundle built: dist/index.js (619 KB)
✓ CSS output: dist/index.css (38 KB)

 Build completed in 1.43s`;

const LUCIDE = `src/App/Dashboard.tsx:127:11 - error TS2322: Type 'LucideIcon' is not assignable to type 'ComponentType<{ className?: string | undefined; }>'.
  Type 'ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>' is not assignable to type 'FunctionComponent<{ className?: string | undefined; }>'.
    Types of property 'propTypes' are incompatible.
      Type 'WeakValidationMap<Omit<LucideProps, "ref">>' is not assignable to type 'WeakValidationMap<{ className?: string | undefined; }>'.

127           icon={CalendarDays}
              ~~~~`;

const UNRESOLVED = `Building your component library...


✗ Error : Build failed with 2 errors:
src/App/index.tsx:7:29: ERROR: Could not resolve "./VendorDetail"
src/App/Overview.tsx:14:82: ERROR: No matching export in "src/lib/format.ts" for import "renewalLabel"`;

const CSS = `✗ Error : Build failed with 1 error:
node_modules/postcss/lib/input.js:135:15: ERROR: [plugin: tooljet-postcss] /Users/someone/apps/cm-help1-t/frontend/styles/global.css:100:1: Unknown word */`;

describe('parseBuildProblems', () => {
  it('reads TypeScript errors with the line of code, as a write path', () => {
    const problems = parseBuildProblems(QUERY_ERROR);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatchObject({
      at: 'frontend/src/App/Tickets.tsx:261:177',
      code: 'TS2322',
      source: '{tickets.error ? <Card><CardContent>{tickets.error}</CardContent></Card> : null}',
      fix: 'render error.message, not the error',
    });
    expect(problems[1].fix).toMatch(/give the parameter a type/);
  });

  it('keeps a long chain to its first lines', () => {
    const [p] = parseBuildProblems(LUCIDE);
    expect(p.message.split(' / ')).toHaveLength(3);
    expect(p.source).toBe('icon={CalendarDays}');
    expect(p.fix).toMatch(/LucideIcon/);
  });

  it('reads bundle errors: a file not written yet, a missing export', () => {
    expect(parseBuildProblems(UNRESOLVED)).toEqual([
      { at: 'frontend/src/App/index.tsx:7:29', code: 'ESBUILD', message: 'Could not resolve "./VendorDetail"', fix: expect.stringMatching(/no such file/) },
      { at: 'frontend/src/App/Overview.tsx:14:82', code: 'ESBUILD', message: 'No matching export in "src/lib/format.ts" for import "renewalLabel"', fix: expect.stringMatching(/export that name/) },
    ]);
  });

  it('names the stylesheet, not the PostCSS internals or a server path', () => {
    expect(parseBuildProblems(CSS)).toEqual([
      { at: 'frontend/styles/global.css:100:1', code: 'CSS', message: 'Unknown word */', fix: expect.stringMatching(/stray/) },
    ]);
  });

  it('finds nothing in a clean build', () => {
    expect(parseBuildProblems('✓ TypeScript compiled (0 errors)\n✓ Bundle built')).toEqual([]);
  });
});

describe('formatProblems', () => {
  it('one line each, and one entry for the same error on several lines of a file', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ at: `frontend/src/App/A.tsx:${i + 1}:5`, code: 'TS7006', message: "Parameter 'row' implicitly has an 'any' type." }));
    const lines = formatProblems([...many, ...parseBuildProblems(QUERY_ERROR)]);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^frontend\/src\/App\/A\.tsx:1:5, :2:5, .*:30:5 TS7006 /);
    expect(lines[1]).toBe(
      "frontend/src/App/Tickets.tsx:261:177 TS2322 Type 'QueryError' is not assignable to type 'ReactNode'. | code: {tickets.error ? <Card><CardContent>{tickets.error}</CardContent></Card> : null} | fix: render error.message, not the error"
    );
  });

  it('caps the list', () => {
    const lines = formatProblems(Array.from({ length: 50 }, (_, i) => ({ at: `frontend/src/F${i}.tsx:1:1`, code: 'TS2304', message: 'x' })), 40);
    expect(lines).toHaveLength(41);
    expect(lines[40]).toBe('... and 10 more');
  });

  it('is much shorter than the report it replaces', () => {
    expect(formatProblems(parseBuildProblems(QUERY_ERROR)).join('\n').length + buildSummary(QUERY_ERROR).length).toBeLessThan(QUERY_ERROR.length);
  });
});

describe('fixes for the mistakes that recur', () => {
  it.each([
    ['TS18048', "'detail.data' is possibly 'undefined'.", /q\.data \?\? \[\]/],
    ['TS18047', "'item.booking_date' is possibly 'null'.", /T \| null/],
    ['TS2339', "Property 'title' does not exist on type '{ added_by: string; created_at: string; }'.", /Row type/],
    ['TS2307', "Cannot find module '@tooljet/custom-component-sdk' or its corresponding type declarations.", /never declare the module/],
    ['TS2305', "Module './lib/format' has no exported member 'renewalLabel'.", /export that name/],
    ['ESBUILD', 'Could not resolve "@tooljet/react/api"', /@tooljet\/custom-component-sdk/],
    ['ESBUILD', 'The symbol "setFollowUp" has already been declared', /remove one/],
    ['TS2451', "Cannot redeclare block-scoped variable 'setFollowUp'.", /remove one/],
  ])('%s %s', (code, message, fix) => {
    expect(fixFor(code, message)).toMatch(fix);
  });

  it('a route id the routes do not have, told by the line of code', () => {
    const p = fromChecked({ file: 'src/App/Overview.tsx', line: 133, column: 30, code: 'TS2345', message: 'Argument of type \'"budgets"\' is not assignable to parameter of type \'"home" | "about"\'.', source: "<Link to={routePath('budgets')}>" });
    expect(p.fix).toMatch(/app\.json's routes/);
  });

  it('says nothing it does not know', () => {
    expect(fixFor('TS2367', "This comparison appears to be unintentional because the types '5000' and '0' have no overlap.")).toBeUndefined();
  });
});

describe('buildSummary', () => {
  it('keeps the counts and outputs, drops the error blocks', () => {
    expect(buildSummary(QUERY_ERROR).split('\n')).toEqual([
      '✗ Error : TypeScript compiled (2 errors)',
      '✓ Manifest generated: dist/manifest.json (1 components)',
      '✓ Bundle built: dist/index.js (619 KB)',
      '✓ CSS output: dist/index.css (38 KB)',
      ' Build completed in 1.43s',
    ]);
  });
});
