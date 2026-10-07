import { expect, it } from 'vitest';
import { replaceFingerprint, replaceView } from '../src/pageReplace.js';

it.each(['icon', 'hidden'] as const)('invalidates a replacement after the editor changes page %s', (field) => {
  const summary = {
    app_id: 'lab-app', version_id: 'draft-2', queries: [], events: [],
    pages: [{ id: 'lab-page', name: 'Experiments', handle: 'experiments', icon: 'flask', hidden: false, components: [] }],
  };
  const plan = { pages: [{ name: 'Experiments', replace: true }] };
  const fingerprint = (app: typeof summary) => replaceFingerprint(app, replaceView(app, plan)!);
  const changed = structuredClone(summary);
  if (field === 'icon') changed.pages[0]!.icon = 'beaker';
  else changed.pages[0]!.hidden = true;
  expect(fingerprint(changed)).not.toBe(fingerprint(summary));
});
