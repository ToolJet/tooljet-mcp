import { describe, expect, it, vi } from 'vitest';
import { bindingReferences } from '../src/bindingReferences.js';
import { validateAppStructure } from '../src/lint.js';
import { getAppSummaryTool } from '../src/tools/getAppSummary.js';
import { lintPlannedApp } from '../src/appSpecLint.js';
import { validateEvents } from '../src/eventValidation.js';
import type { EventSpec } from '../src/tooljetClient.js';
import type { AppSummary, ToolJetClient } from '../src/tooljetClient.js';

describe('Luna trace regressions (shared contracts)', () => {
  it('rejects prefill before a modal mounts, but allows mounted input controls and declarative defaults', () => {
    const summary: AppSummary = {app_id:'a',pages:[{id:'p',name:'Home',components:[
      {id:'queue',name:'Queue',type:'Table'},
      {id:'modal',name:'EditJob',type:'ModalV2'},
      {id:'notes',name:'Notes',type:'TextArea',parent:'modal'},
      {id:'outside',name:'Outside',type:'TextArea'},
    ]}],queries:[],events:[]};
    const prefill: EventSpec = {sourceId:'queue',sourceType:'component',trigger:'onRowClicked',
      action:{actionId:'control-component',componentId:'notes',componentSpecificActionHandle:'setText',
        componentSpecificActionParams:[{handle:'text',value:'{{components.Queue.selectedRow.notes}}'}]}};
    const open: EventSpec = {sourceId:'queue',sourceType:'component',trigger:'onRowClicked',
      action:{actionId:'show-modal',modal:'modal'}};
    expect(validateEvents(summary,[prefill,open]).errors.join(' ')).toContain('before show-modal');
    expect(validateEvents(summary,[open]).errors).toEqual([]);
    expect(validateEvents(summary,[{...prefill,action:{...prefill.action,componentId:'outside'}},open]).errors).toEqual([]);
    expect(validateEvents(summary,[{...prefill,sourceId:'modal',trigger:'onOpen'}]).errors).toEqual([]);
  });
  it('rejects copying synthetic ids from diagnostics into event actions', () => {
    const result = lintPlannedApp({
      queries: [{clientRef:'jobs',name:'jobs',kind:'runjs',options:{code:'return []'}}],
      pages: [{name:'Home',icon:'IconHome2',components:[{name:'Refresh',type:'Button'}]}],
      events: [{sourceRef:'Refresh',sourceType:'component',trigger:'onClick',
        action:{actionId:'run-query',queryId:'planned-query:0:jobs'}}],
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('synthetic planned ids cannot be saved');
  });
  it('finds embedded and optional references, not quoted examples or plain text', () => {
    expect(bindingReferences({value: "{{(queries.jobs.data||[]).filter(r => !components.SearchJobs?.value && components?.Status.value && components['Owner'].value)}}"}))
      .toEqual([{namespace:'queries',name:'jobs'}, {namespace:'components',name:'SearchJobs'},
        {namespace:'components',name:'Status'}, {namespace:'components',name:'Owner'}]);
    expect(bindingReferences("{{'components.fake' + \"queries.fake\" /* components.fake */}}" )).toEqual([]);
    expect(bindingReferences('Documentation: components.fake')).toEqual([]);
  });

  it('catches case mistakes inside filters and save query inputs', () => {
    const summary: AppSummary = { app_id:'a', name:'A', pages:[{id:'p',name:'Home',handle:'home',components:[
      {id:'search',name:'SearchJobs',type:'TextInput'},
      {id:'list',name:'Queue',type:'Table',properties:{data:{value:'{{(queries.jobs.data||[]).filter(r=>!components.searchJobs?.value)}}'}}},
    ]}],queries:[{id:'q',name:'jobs'}, {id:'save',name:'save',options:{value:'{{components.editTechnician.value}}'}}],events:[] };
    const result = validateAppStructure(summary);
    expect(result.errors.join(' ')).toContain('components.searchJobs');
    expect(result.errors.join(' ')).toContain('components.editTechnician');
  });

  it('rejects placeholder selectors instead of returning a misleading empty app', async () => {
    const getAppSummary = vi.fn().mockResolvedValue({app_id:'a',pages:[],queries:[],events:[]});
    const tool = getAppSummaryTool({getAppSummary} as unknown as ToolJetClient);
    for (const placeholder of ['', '*', '00000000-0000-0000-0000-000000000000']) {
      const result = await tool.handler({app_id:'a',page_ids:[placeholder]});
      expect(result.isError).toBe(true);
    }
    expect(getAppSummary).not.toHaveBeenCalled();
    expect((await tool.handler({app_id:'a'})).isError).not.toBe(true);
  });
});
