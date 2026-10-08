import { describe, expect, it } from 'vitest';
import { matchPlannedPage } from '../src/pageMatch.js';
import { lintPlannedApp } from '../src/appSpecLint.js';

// Review 2026-09-25: a plan page named "Home" also matched the page at handle "home", which in agent-built apps is
// usually "Dashboard", so its components could land there although a page named Home existed.
describe('the page a plan page stands for', () => {
  const pages = [
    { id: 'p1', name: 'Dashboard', handle: 'home' },
    { id: 'p2', name: 'Home', handle: 'home-2' },
  ];

  it('is the page of that name when one exists', () => {
    expect(matchPlannedPage(pages, 'Home', new Set(['Home']))?.id).toBe('p2');
    expect(matchPlannedPage(pages, 'Dashboard', new Set(['Dashboard']))?.id).toBe('p1');
  });

  it('falls back to handle home only when no page is named Home', () => {
    expect(matchPlannedPage([pages[0]!], 'Home', new Set(['Home']))?.id).toBe('p1');
  });

  it('never takes the handle-home page when the plan names that page too', () => {
    expect(matchPlannedPage([pages[0]!], 'Home', new Set(['Home', 'Dashboard']))).toBeUndefined();
  });

  it('skips pages another plan page already claimed', () => {
    expect(matchPlannedPage(pages, 'Home', new Set(['Home']), new Set(['p2']))).toBeUndefined();
  });

  it('is the same page in the plan lint', () => {
    const summary = (pages: unknown[]) => ({ app_id: 'a', version_id: 'v', queries: [], events: [], pages });
    const dashboard = { id: 'p1', name: 'Dashboard', handle: 'home', components: [{ id: 'c1', name: 'kpi', type: 'Text',
      properties: { text: { value: 'x' } }, layouts: { desktop: { top: 10, left: 1, width: 40, height: 40 } } }] };
    const plan = { pages: [{ name: 'Home', icon: 'IconHome', components: [{ name: 'hello', type: 'Text', properties: { text: 'Hi' },
      layout: { top: 10, left: 1, width: 40, height: 40 } }] }] };
    // With a real Home page, the plan's Home is that page, so nothing overlaps the Dashboard's text.
    expect(lintPlannedApp(plan as never, summary([dashboard, { id: 'p2', name: 'Home', handle: 'home-2', components: [] }]) as never).errors).toEqual([]);
    // Without one, Home stands for the page at handle home.
    expect(lintPlannedApp(plan as never, summary([dashboard]) as never).errors.join(' ')).toMatch(/"kpi" and "hello" overlap/);
  });
});
