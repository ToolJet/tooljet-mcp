import { describe, expect, it } from 'vitest';
import { assertAgentModelCapability } from '../../src/workflows/integrationPreflight.js';

describe('workflow integration preflight', () => {
  it('rejects a live Agent test when the selected datasource is not AI-capable', () => {
    const report = {
      version_id: '11111111-1111-4111-8111-111111111111',
      authorable_node_types: ['agent'],
      datasources: [{ id: 'rest', name: 'REST', kind: 'restapi', capabilities: ['query'] as const }],
    };
    expect(() => assertAgentModelCapability(report, 'rest')).toThrow(/not an AI model/i);
  });
});
