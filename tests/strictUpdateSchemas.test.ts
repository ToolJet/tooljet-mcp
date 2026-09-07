import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ToolJetClient } from '../src/tooljetClient.js';
import { createClient } from '../src/tooljetClient.js';
import type { Config } from '../src/config.js';
import type { Auth } from '../src/auth.js';
import { updateComponentsTool } from '../src/tools/updateComponents.js';
import { updateLayoutTool } from '../src/tools/updateLayout.js';
import { updateEventsTool } from '../src/tools/updateEvents.js';
import { updatePagesTool } from '../src/tools/updatePages.js';
import type { ToolDef } from '../src/tools/types.js';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

// The MCP SDK wraps every tool's raw shape in z.object() before the handler runs; mirror that here so
// the tests exercise exactly the validation the model's payload meets.
function parseArgs(tool: ToolDef, args: unknown) {
  return z.object(tool.inputSchema).safeParse(args);
}

function issueText(result: z.ZodSafeParseResult<unknown>): string {
  return result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');
}

function summaryClient(components: Array<Record<string, unknown>>): ToolJetClient {
  return {
    getAppSummary: vi.fn().mockResolvedValue({
      app_id: 'app1',
      pages: [{ id: 'p1', components }],
      queries: [],
      events: [],
    }),
    updateComponents: vi.fn().mockResolvedValue({ updated: 1 }),
    updateLayouts: vi.fn().mockResolvedValue({ updated: 1 }),
  } as unknown as ToolJetClient;
}

const textComponent = {
  id: 'c-title', name: 'title', type: 'Text',
  properties: { text: { value: 'Old' } }, styles: {},
  layouts: { desktop: { top: 0, left: 0, width: 20, height: 40 } },
};

// Regression (observed 2026-09-05): five update_components calls in a row sent `properties` at the
// top level of each entry instead of under `definition`. zod stripped the unknown key, the PUT body
// carried `{ component: {} }`, ToolJet answered 200 without writing anything, and the tool reported
// `{"updated":1}` every time. Nothing persisted and nothing said so.
describe('update_components strict entries', () => {
  const tool = updateComponentsTool({} as ToolJetClient);

  it('rejects a top-level properties patch and says to nest it under definition', () => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v', page_id: 'p',
      updates: [{ component_id: 'title', properties: { text: 'New' } }],
    });
    expect(result.success).toBe(false);
    expect(issueText(result)).toMatch(/"properties".*under `definition`/i);
  });

  it.each(['styles', 'validation', 'others', 'general'])('rejects a top-level %s patch', (section) => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v', page_id: 'p',
      updates: [{ component_id: 'title', [section]: { x: 1 } }],
    });
    expect(result.success).toBe(false);
    expect(issueText(result)).toMatch(new RegExp(`"${section}".*under \`definition\``, 'i'));
  });

  it.each(['layout', 'layouts'])('points a top-level %s key at update_layout', (key) => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v', page_id: 'p',
      updates: [{ component_id: 'title', [key]: { top: 0, left: 0, width: 10, height: 40 } }],
    });
    expect(result.success).toBe(false);
    expect(issueText(result)).toMatch(new RegExp(`"${key}".*update_layout`, 'i'));
  });

  it('rejects unknown keys inside definition (e.g. layout) instead of stripping them', () => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v', page_id: 'p',
      updates: [{ component_id: 'title', definition: { layout: { top: 0, left: 0, width: 10, height: 40 } } }],
    });
    expect(result.success).toBe(false);
    expect(issueText(result)).toMatch(/definition.*"layout".*update_layout/i);
  });

  it('still accepts a well-formed definition entry and a rename entry', () => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v', page_id: 'p',
      updates: [
        { component_id: 'title', definition: { properties: { text: 'New' }, styles: { textSize: 20 } } },
        { component_id: 'other', name: 'renamed' },
        { component_id: 'third', parent: 'modal1', slot_name: 'header' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('fails an entry that changes nothing instead of reporting it as updated', async () => {
    const client = summaryClient([textComponent]);
    const result = await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 'title' }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/"title".*nothing to update.*definition/i);
    expect(client.updateComponents).not.toHaveBeenCalled();
  });

  it('fails an entry whose definition has only empty sections', async () => {
    const client = summaryClient([textComponent]);
    const result = await updateComponentsTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      updates: [{ component_id: 'title', definition: { properties: {} } }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/nothing to update/i);
    expect(client.updateComponents).not.toHaveBeenCalled();
  });

  it('describes the definition nesting so the model gets the shape right first time', () => {
    expect(tool.description).toMatch(/unknown.*keys.*rejected|rejected.*unknown/i);
  });
});

describe('update_layout strict entries', () => {
  const tool = updateLayoutTool({} as ToolJetClient);

  it('rejects a bare rect at the top level and says to nest it under desktop/mobile', () => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v', page_id: 'p',
      layouts: [{ component_id: 'title', top: 0, left: 0, width: 10, height: 40 }],
    });
    expect(result.success).toBe(false);
    expect(issueText(result)).toMatch(/"top".*desktop.*mobile/i);
  });

  it.each(['layout', 'layouts'])('rejects a nested %s wrapper', (key) => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v', page_id: 'p',
      layouts: [{ component_id: 'title', [key]: { desktop: { top: 0, left: 0, width: 10, height: 40 } } }],
    });
    expect(result.success).toBe(false);
    expect(issueText(result)).toMatch(new RegExp(`"${key}".*desktop`, 'i'));
  });

  it('points a definition/properties patch at update_components', () => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v', page_id: 'p',
      layouts: [{ component_id: 'title', definition: { properties: { text: 'x' } } }],
    });
    expect(result.success).toBe(false);
    expect(issueText(result)).toMatch(/"definition".*update_components/i);
  });

  it('fails an entry with no desktop, mobile, parent or slot_name instead of writing an empty diff', async () => {
    const client = summaryClient([textComponent]);
    const result = await updateLayoutTool(client).handler({
      app_id: 'app1', version_id: 'v1', page_id: 'p1',
      layouts: [{ component_id: 'title' }],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toMatch(/"title".*nothing to update/i);
    expect(client.updateLayouts).not.toHaveBeenCalled();
  });
});

describe('update_events strict entries', () => {
  const tool = updateEventsTool({} as ToolJetClient);

  it('rejects action fields at the top level and says to nest them under event', () => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v',
      events: [{ event_id: 'e1', name: 'onClick', actionId: 'run-query', queryId: 'q1' }],
    });
    expect(result.success).toBe(false);
    expect(issueText(result)).toMatch(/"actionId".*under `event`/i);
  });

  it('still accepts update and reorder entries', () => {
    expect(parseArgs(tool, {
      app_id: 'a', version_id: 'v',
      events: [{ event_id: 'e1', name: 'onClick', event: { eventId: 'onClick', actionId: 'run-query' } }],
    }).success).toBe(true);
    expect(parseArgs(tool, {
      app_id: 'a', version_id: 'v', update_type: 'reorder',
      events: [{ event_id: 'e1', index: 2 }],
    }).success).toBe(true);
  });
});

describe('update_pages strict entries', () => {
  const tool = updatePagesTool({} as ToolJetClient);

  it('rejects unknown page fields such as title instead of stripping them', () => {
    const result = parseArgs(tool, {
      app_id: 'a', version_id: 'v',
      updates: [{ page_id: 'p1', title: 'Overview' }],
    });
    expect(result.success).toBe(false);
    expect(issueText(result)).toMatch(/"title".*name.*icon.*hidden/i);
  });

  it('still accepts name/icon/hidden updates', () => {
    expect(parseArgs(tool, {
      app_id: 'a', version_id: 'v',
      updates: [{ page_id: 'p1', name: 'Overview', icon: 'home', hidden: false }],
    }).success).toBe(true);
  });
});

// Last line of defence: even a caller that bypasses the tool layer can never PUT an empty diff and
// have it reported as an update.
describe('client refuses empty update diffs', () => {
  const config: Config = { apiUrl: 'http://localhost:3000', appUrl: 'http://localhost:8082', email: 'a@b.com', password: 'pw' };
  function makeAuth(): Auth & { authedFetch: ReturnType<typeof vi.fn> } {
    return {
      authedFetch: vi.fn(),
      getOrganizationId: vi.fn().mockResolvedValue('org1'),
      getOrganizationSlug: vi.fn().mockResolvedValue('ws'),
    };
  }

  it('updateComponents throws when an entry has neither a definition nor a name/parent change', async () => {
    const auth = makeAuth();
    const client = createClient(auth, config);
    await expect(client.updateComponents({
      appId: 'app1', versionId: 'v1', pageId: 'p1',
      updates: [{ componentId: 'c-1', definition: {} }],
    })).rejects.toThrow(/c-1.*nothing to update/i);
    expect(auth.authedFetch).not.toHaveBeenCalled();
  });

  it('updateComponents throws when every definition section is empty', async () => {
    const auth = makeAuth();
    const client = createClient(auth, config);
    await expect(client.updateComponents({
      appId: 'app1', versionId: 'v1', pageId: 'p1',
      updates: [{ componentId: 'c-1', definition: { properties: {}, styles: {} } }],
    })).rejects.toThrow(/c-1.*nothing to update/i);
    expect(auth.authedFetch).not.toHaveBeenCalled();
  });

  it('updateLayouts throws when an entry has neither a rect nor a parent change', async () => {
    const auth = makeAuth();
    const client = createClient(auth, config);
    await expect(client.updateLayouts({
      appId: 'app1', versionId: 'v1', pageId: 'p1',
      layouts: [{ componentId: 'c-1' }],
    })).rejects.toThrow(/c-1.*nothing to update/i);
    expect(auth.authedFetch).not.toHaveBeenCalled();
  });
});

// Regression: ModalV2 has a real `size` property (sm/md/lg/xl = modal width). The text-size alias
// table rewrote it to styles.textSize, then a second warning said textSize is unknown for ModalV2.
describe('size alias is scoped to components with a textSize style', () => {
  it('leaves ModalV2 properties.size alone and emits no alias warning', () => {
    const result = normalizeComponentSpec({
      name: 'detailModal',
      type: 'ModalV2',
      properties: { size: 'lg', showHeader: true },
    } as never);
    expect((result.component.properties.size as { value: unknown }).value).toBe('lg');
    expect(result.component.styles?.textSize).toBeUndefined();
    expect(result.warnings.filter((w) => /size|textSize/i.test(w))).toEqual([]);
  });

  it('still moves Text properties.size to styles.textSize', () => {
    const result = normalizeComponentSpec({
      name: 'title',
      type: 'Text',
      properties: { text: 'Hello', size: 24 },
    } as never);
    expect(result.component.properties.size).toBeUndefined();
    expect((result.component.styles?.textSize as { value: unknown }).value).toBe(24);
    expect(result.warnings.some((w) => /moved alias "size" to styles\.textSize/.test(w))).toBe(true);
  });

  it('does not alias a key to a style the component type lacks', () => {
    // Divider has no textColor style; `color` must not be rewritten to a key ToolJet would ignore.
    const result = normalizeComponentSpec({
      name: 'rule',
      type: 'Divider',
      properties: { color: '#000' },
    } as never);
    expect(result.component.styles?.textColor).toBeUndefined();
    expect(result.warnings.some((w) => /textColor/.test(w))).toBe(false);
  });
});
