import { describe, expect, it, vi } from 'vitest';
import { missingCreateRowColumns } from '../src/createRowRequiredColumns.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

describe('create_row required-column coverage', () => {
  const columns=[{name:'id',type:'string',primaryKey:true},{name:'amount',type:'integer',notNull:true},
    {name:'active',type:'boolean',notNull:true},{name:'notes',type:'string'}];
  const options={operation:'create_row',create_row:{0:{column:'amount',value:0},1:{column:'active',value:false}}};
  it('finds the workshop missing custom primary key, while preserving zero and false', () => {
    expect(missingCreateRowColumns(options,columns)).toEqual(['id']);
    expect(missingCreateRowColumns({...options,create_row:{...options.create_row,2:{column:'id',value:'{{variables.newId}}'}}},columns)).toEqual([]);
  });
  it('accepts real defaults and serial keys but not null defaults', () => {
    const cols=[{name:'id',type:'serial',primaryKey:true},...['',false,0,'nextval(\'s\')'].map((v,i)=>({name:`c${i}`,type:'string',notNull:true,defaultValue:v})),{name:'needed',type:'string',notNull:true,defaultValue:null}];
    expect(missingCreateRowColumns({operation:'create_row',create_row:{}},cols)).toEqual(['needed']);
  });
  it.each(['{{variables.columns}}',{0:{column:'{{variables.column}}',value:'x'}},{title:'bad-shape'}])('leaves dynamic/malformed maps to other validation: %j', create_row => {
    expect(missingCreateRowColumns({operation:'create_row',create_row},columns)).toBeUndefined();
  });
  it('does not apply insert requirements to partial updates or optional nulls', () => {
    expect(missingCreateRowColumns({...options,operation:'update_rows'},columns)).toBeUndefined();
    expect(missingCreateRowColumns({operation:'create_row',create_row:{0:{column:'notes',value:null}}},[{name:'notes',type:'string'}])).toEqual([]);
  });
  it.each([true,false])('checks only targeted schemas once; planned=%s', async planned => {
    const client={listTables:vi.fn().mockResolvedValue(planned?[]:[{id:'jobs-id',table_name:'jobs'},{id:'unrelated',table_name:'other'}]),
      listDatasources:vi.fn().mockResolvedValue([{id:'tjdb',name:'ToolJet DB',kind:'tooljetdb'}]),
      getTableSchema:vi.fn().mockResolvedValue(columns.map(c=>({...c,isPrimaryKey:c.primaryKey,isNotNull:c.notNull}))),
    } as unknown as ToolJetClient;
    const result=await lintAppSpecTool(client).handler({version_id:'v1',...(planned?{tables:[{table_name:'jobs',columns}]}:{}),
      queries:[{name:'createJob',datasource_id:'tjdb',table_ref:'jobs',options},{name:'createOtherJob',datasource_id:'tjdb',table_ref:'jobs',options}]});
    const body=JSON.parse(result.content[0]!.text);
    expect((planned?body.errors:body.warnings).join(' ')).toContain('omits required non-generated column(s) "id"');
    if(planned) {expect(body.ok).toBe(false);expect(client.getTableSchema).not.toHaveBeenCalled();}
    else {expect(body.ok).toBe(true);expect(client.getTableSchema).toHaveBeenCalledExactlyOnceWith('jobs');}
  });
  it('reports unavailable metadata without claiming inserts are verified', async () => {
    const client={listTables:vi.fn().mockResolvedValue([{id:'jobs-id',table_name:'jobs'}]),listDatasources:vi.fn().mockResolvedValue([{id:'tjdb',name:'ToolJet DB',kind:'tooljetdb'}]),getTableSchema:vi.fn().mockRejectedValue(new Error('offline'))} as unknown as ToolJetClient;
    const result=await lintAppSpecTool(client).handler({version_id:'v1',queries:[{name:'createJob',datasource_id:'tjdb',table_ref:'jobs',options}]});
    const body=JSON.parse(result.content[0]!.text);
    expect(body.ok).toBe(true);
    expect(body.warnings.join(' ')).toContain('required insert columns');
    expect(body.warnings.join(' ')).not.toContain('omits required');
  });
});
