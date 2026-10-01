/**
 * The existing page a plan page stands for: the page of that name, and only when no page has the name "Home", the
 * page at handle "home" for a plan page named Home. Matching the handle as well took "Dashboard" (agent-built apps
 * keep their first page at handle home) over a real "Home" page (review 2026-09-25). A page the plan names itself is
 * never taken through the handle. lint_app_spec and apply_app_phase share this, so they cannot disagree.
 */
export function matchPlannedPage<P extends { id: string; name?: string; handle?: string }>(
  pages: P[], name: string, plannedNames: Set<string>, claimed: Set<string> = new Set()
): P | undefined {
  const byName = pages.find((page) => page.name === name && !claimed.has(page.id));
  if (byName || name !== 'Home' || pages.some((page) => page.name === 'Home')) return byName;
  return pages.find((page) => page.handle === 'home' && !claimed.has(page.id) && !plannedNames.has(page.name ?? ''));
}
