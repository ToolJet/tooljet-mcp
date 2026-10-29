import { afterEach, describe, expect, it } from 'vitest';
import { loadInstalledPacks, type InstalledLibrary } from '../src/packCatalog.js';
import { registerLibraryPacks } from '../src/libraryPack.js';
import { lintComponentSpec } from '../src/lint.js';

// A server that ships component packs has no UI 2.0 Shad* widgets: an edit that wrote a ShadButton saved it and the app
// drew "This widget is not available" (staging, 2026-10-29).
const library: InstalledLibrary = {
  id: 'lib-1',
  name: 'shadcn UI',
  correlationId: 'corr-1',
  revisions: [{ version: '2.1.33' }],
  manifest: {
    manifestVersion: 2,
    pack: 'shadcn',
    components: { Button: { props: [{ name: 'text', type: 'string', default: 'Button' }] } },
  },
};
const button = { name: 'logout', type: 'ShadButton', layout: { top: 0, left: 0, width: 6, height: 4 } };

describe('a UI 2.0 widget on a server that ships component packs', () => {
  afterEach(() => registerLibraryPacks([]));

  it('is refused, naming the pack component to write', async () => {
    await loadInstalledPacks(async () => [library]);
    const { errors } = lintComponentSpec(button);
    expect(errors.join('\n')).toContain('"ShadButton" is not available on this ToolJet');
    expect(errors.join('\n')).toContain('Lib_shadcn_Button');
  });

  it('is left alone when the server announced no packs', () => {
    registerLibraryPacks([]);
    expect(lintComponentSpec(button).errors.join('\n')).not.toContain('is not available on this ToolJet');
  });
});
