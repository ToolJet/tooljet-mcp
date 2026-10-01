import { expect, it } from 'vitest';
import { encodeComponentParent, decodeComponentParent } from '../src/componentParent.js';
import { prepareComponentBatch } from '../src/componentBatch.js';
import { lintComponentSlots, lintKanbanInteractions, lintKanbanCardChildren } from '../src/lint.js';

it('round trips the source-verified Kanban modal canvas parent', () => {
  const id='11111111-1111-4111-8111-111111111111';
  expect(encodeComponentParent(id,'modal')).toBe(id+'-modal');
  expect(decodeComponentParent(id+'-modal')).toEqual({parentId:id,slotName:'modal'});
  expect(encodeComponentParent(id+'-modal','body')).toBe(id);
});
it('creates card defaults independently of explicit modal content', () => {
  const result=prepareComponentBatch([
    {name:'Board',type:'Kanban',client_ref:'board',properties:{openModalOnCardClick:true},layout:{top:0,left:0,width:43,height:490}},
    {name:'Detail',type:'Text',parent_ref:'board',slot_name:'modal',properties:{text:'{{cardData.title}}'},layout:{top:20,left:2,width:39,height:40}},
  ]);
  expect(result.errors).toEqual([]);
  expect(result.components.filter(c=>c.parentRef==='board'&&!c.slotName)).toHaveLength(2);
  expect(result.components.find(c=>c.name==='Detail')?.slotName).toBe('modal');
  expect(result.warnings.join(' ')).not.toMatch(/blank built-in modal/);
});
it('validates slot ownership and separates modal geometry from narrow card text rules', () => {
  const board={id:'board',type:'Kanban',properties:{openModalOnCardClick:true}};
  const detail={id:'detail',type:'Text',parent:'board-modal',layout:{left:0,top:0,width:10,height:40}};
  expect(lintComponentSlots([board,detail])).toEqual([]);
  expect(lintKanbanCardChildren([board,detail])).toEqual([]);
  expect(lintKanbanInteractions([board,detail])).toEqual([]);
  expect(lintComponentSlots([{id:'wrong',type:'ModalV2'},{...detail,parent:'wrong-modal'}])).toHaveLength(1);
});
it('warns for default/native cards too, not just custom HTML cards', () => {
  expect(lintKanbanInteractions([{id:'board',type:'Kanban',properties:{openModalOnCardClick:true}},{id:'title',parent:'board',type:'Text'}])).toHaveLength(1);
  expect(lintKanbanInteractions([{id:'board',type:'Kanban',properties:{openModalOnCardClick:false}}])).toEqual([]);
});
it('does not call a card child narrow when a sibling shares its row on purpose', () => {
  const board={id:'board',type:'Kanban',properties:{}};
  const title={id:'title',type:'Text',parent:'board',layout:{left:2,top:4,width:26,height:30}};
  const amount={id:'amount',type:'Text',parent:'board',layout:{left:29,top:4,width:12,height:30}};
  expect(lintKanbanCardChildren([board,title,amount])).toEqual([]);
  expect(lintKanbanCardChildren([board,{...title,layout:{left:2,top:40,width:26,height:30}},amount])).toHaveLength(2);
});
