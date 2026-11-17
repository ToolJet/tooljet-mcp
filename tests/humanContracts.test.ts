import { describe, expect, it } from 'vitest';
import { compileGraph, definition, specSchema } from '../src/workflows/graph.js';
import { humanConfigurationErrors } from '../src/workflows/nodeContracts.js';

const nodeId = 'aba5d893-17ab-4248-b745-85e835753cd4';
const reviewerId = 'edf4b344-7e20-4d86-b68f-2710ce4b1665';
const outcomes = [{ key: 'confirm', label: 'Confirm' }, { key: 'revise', label: 'Revise' }];
const current = (data: Record<string, unknown> = {}) => definition({
  nodes: [{ id: nodeId, type: 'human', data: { nodeName: 'stockReview', outcomes, approvers: { users: [reviewerId], tokenBypass: true }, ...data } }],
  edges: [], queries: [],
});
const patch = (input: Record<string, unknown>, graph = current()) => compileGraph(graph, specSchema.parse({
  nodes: [{ ref: 'review', type: 'human', existing_id: nodeId, name: 'stockReview', outcomes, approvers: {}, ...input }],
})).graph.nodes[0]!.data;

describe('Human patches validate their effective persisted configuration', () => {
  it('allows disabling token bypass when existing users remain configured', () => {
    expect(patch({ approvers: { tokenBypass: false } }).approvers).toEqual({ users: [reviewerId], tokenBypass: false });
  });

  it('rejects clearing the last approver when retained token bypass is disabled', () => {
    expect(() => patch({ approvers: { users: [] } }, current({ approvers: { users: [reviewerId], tokenBypass: false } }))).toThrow('approver');
  });

  it('checks a retained timeout against replaced outcomes', () => {
    const graph = current({ timeout: { enabled: true, durationSeconds: 30, onExpire: 'branch', timeoutOutcome: 'revise' } });
    expect(() => patch({ outcomes: [outcomes[0]] }, graph)).toThrow('existing outcome');
    expect(patch({ description: 'Check the sample shipment' }, graph).timeout).toEqual(graph.nodes[0]!.data.timeout);
    expect(patch({ outcomes: [outcomes[0]], timeout: { enabled: false } }, graph).timeout).toEqual({ enabled: false });
  });

  it.each([0, 0.5, Infinity])('rejects retained invalid timeout duration %s', durationSeconds => {
    expect(() => patch({}, current({ timeout: { enabled: true, durationSeconds } }))).toThrow('one second');
  });

  it('checks retained reminder durations at both supported storage locations', () => {
    expect(() => patch({}, current({ reminders: [{ afterSeconds: 0 }] }))).toThrow('reminders');
    expect(() => patch({}, current({ timeout: { enabled: false, reminders: [{ afterSeconds: 0.5 }] } }))).toThrow('reminders');
    expect(patch({}, current({ reminders: [{ afterSeconds: 15 }], timeout: { enabled: false, reminders: [{ afterSeconds: 20 }] } })).reminders).toEqual([{ afterSeconds: 15 }]);
  });

  it('preserves omitted form/notification fields and outcome editor metadata', () => {
    const inputSchema = [{ name: 'comment', type: 'text', default: '{{ startTrigger.params.comment }}' }];
    const notification = { url: 'https://example.invalid/review', headers: { 'X-Demo': 'synthetic' } };
    const graph = current({ outcomes: outcomes.map(outcome => ({ ...outcome, color: '#334455' })), inputSchema, notification });
    const result = patch({}, graph);
    expect(result.inputSchema).toEqual(inputSchema);
    expect(result.notification).toEqual(notification);
    expect(result.outcomes).toEqual(graph.nodes[0]!.data.outcomes);
    expect(patch({ input_schema: [], notification: {} }, graph)).toMatchObject({ inputSchema: [], notification: {} });
  });

  it('retains the backend token-bypass default when omitted', () => {
    expect(humanConfigurationErrors({ outcomes, approvers: {} })).toEqual([]);
    expect(patch({}, current({ approvers: {} })).approvers).toEqual({});
  });
});
