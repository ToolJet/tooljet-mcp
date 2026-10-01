import { expect, it } from 'vitest';
import { lintSurfaceInsets } from '../src/surfaceInsets.js';
import { lintComponentSpec } from '../src/lint.js';
const card = (text='Revenue', styles={}) => ({type:'Text', name:'Revenue',properties:{text:{value:text}},styles:{backgroundColor:{value:'var(--cc-surface1-surface)'},borderRadius:{value:12},...styles}});
it('warns about edge-hugging native text cards, including default wrapper padding',()=>{
  expect(lintSurfaceInsets(card())).toHaveLength(1);
  expect(lintSurfaceInsets(card('MRR',{borderRadius:{value:'{{12}}'}}))).toHaveLength(1);
  expect(lintSurfaceInsets(card('<div>MRR</div><strong>$100</strong>',{padding:{value:'default'}}))).toHaveLength(1);
  expect(lintSurfaceInsets(card('<div>MRR</div><strong>{{queries.total.data}}</strong><div>Monthly</div>'))).toHaveLength(1);
  expect(lintComponentSpec(card()).warnings.some(w=>w.includes('content inset'))).toBe(true);
});
it('leaves padded, centered, transparent and undecidable content alone',()=>{
  expect(lintSurfaceInsets(card('<div style="padding:12px 16px">MRR</div>'))).toEqual([]);
  expect(lintSurfaceInsets(card('MRR',{textAlign:{value:'center'}}))).toEqual([]);
  expect(lintSurfaceInsets(card('Title',{backgroundColor:{value:'transparent'}}))).toEqual([]);
  expect(lintSurfaceInsets(card('<div class="custom-card">MRR</div>'))).toEqual([]);
  expect(lintSurfaceInsets(card('{{flag ? "<div>One</div>" : "Other"}}'))).toEqual([]);
});
it('reads static markup in concatenated and template-bound metrics without running code',()=>{
  expect(lintSurfaceInsets(card(`{{'ACTIVE PROJECTS<br><strong>' + queries.rows.data.filter(r=>r.active).length + '</strong><br>In pipeline'}}`))).toHaveLength(1);
  expect(lintSurfaceInsets(card('{{`MRR<br><strong>${queries.total.data}</strong>`}}'))).toHaveLength(1);
  expect(lintSurfaceInsets(card(`{{'<div style="padding:12px 16px">MRR ' + queries.total.data + '</div>'}}`))).toEqual([]);
  expect(lintSurfaceInsets(card(`{{'<div class="metric">' + queries.total.data + '</div>'}}`))).toEqual([]);
  expect(lintSurfaceInsets(card(`{{(() => { throw new Error('<div>not executed</div>') })()}}`))).toEqual([]);
});
it('warns about an outer horizontal gutter around a painted HTML surface without rewriting it',()=>{
  const html=(padding:string)=>({type:'Html',name:'Header',properties:{rawHtml:`<div style="height:100%;padding:${padding};background:var(--cc-appBackground-surface)"><div style="background:var(--cc-surface2-surface);padding:18px">Title</div></div>`}});
  expect(lintSurfaceInsets(html('10px 18px'))).toHaveLength(1);
  expect(lintSurfaceInsets(html('10px 0'))).toEqual([]);
  expect(lintSurfaceInsets({type:'Html',properties:{rawHtml:'<div style="padding:18px">Plain text</div>'}})).toEqual([]);
});
