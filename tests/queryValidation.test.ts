import { describe, expect, it } from 'vitest';
import { validateQueryOptions } from '../src/queryValidation.js';

describe('validateQueryOptions', () => {
  it('accepts the ToolJet OpenAI wrapper shape and returns the operation', () => {
    const result = validateQueryOptions('openai', {
      operation: 'chat',
      model: 'gpt-4o-mini',
      prompt: 'Summarize this ticket',
      max_tokens: 200,
    });
    expect(result.operation).toBe('chat');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('blocks missing required wrapper options', () => {
    const result = validateQueryOptions('openai', { operation: 'chat', model: 'gpt-4o-mini' });
    expect(result.errors.map((issue) => issue.code)).toContain('missing_required_option');
    expect(result.errors.map((issue) => issue.path)).toContain('prompt');
  });

  it('warns when upstream API knowledge produces an unknown wrapper key', () => {
    const result = validateQueryOptions('openai', {
      operation: 'chat',
      model: 'gpt-4o-mini',
      prompt: 'hello',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unknown_option_key', path: 'messages' })])
    );
  });

  it('suggests the cross-cutting camelCase run-on-load key', () => {
    const result = validateQueryOptions('postgresql', {
      mode: 'sql',
      query: 'select 1',
      run_on_page_load: true,
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ignored_or_misplaced_option_key', path: 'run_on_page_load' }),
      ])
    );
    expect(result.warnings.map((issue) => issue.message).join(' ')).toMatch(/runOnPageLoad/);
  });

  it('reports invalid operations before any datasource call', () => {
    const result = validateQueryOptions('openai', { operation: 'not-real' });
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'invalid_operation', path: 'operation' })])
    );
  });
});
