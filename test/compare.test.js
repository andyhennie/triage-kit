// Side-by-side comparison: the pure marks, the span maths, and the DOM it draws.
import {test, before, after} from 'node:test'
import assert from 'node:assert/strict'
import {Window} from 'happy-dom'
import {compareRows, spanBox} from '../src/compare.js'

const window=new Window({url:'http://localhost/'})
let mountCompare
before(async()=>{
  for(const key of ['window','document','navigator','HTMLElement','Node'])
    Object.defineProperty(globalThis,key,{value:key==='window'?window:window[key],configurable:true,writable:true})
  ;({mountCompare}=await import('../src/compare.js'))
})
after(()=>window.happyDOM.close())

const trips=[
  {id:'a',name:'Beach A',total:36774,board:'All inclusive',flights:[{start:13.7,end:17.5},{start:17.5,end:19.7,kind:'gap'},{start:19.7,end:23.5}]},
  {id:'b',name:'Beach B',total:40203,board:'All inclusive',flights:[{start:9.5,end:11.4},{start:11.4,end:14.7,kind:'gap'},{start:14.7,end:18.4}]},
]
const fields=[
  {id:'total',label:'Total',value:t=>t.total,better:'low'},
  {id:'board',label:'Board',value:t=>t.board,differs:true},
  {id:'out',label:'Out',spans:t=>t.flights,axis:{min:0,max:24,ticks:[0,12,24],shade:[[0,6],[22,24]]}},
]

test('the lowest total is best and the other gets its distance to it',()=>{
  const [total]=compareRows(trips,fields)
  assert.deepEqual(total.cells.map(c=>[c.best,c.delta]),[[true,null],[false,3429]])
})

test('equal values, one item or text without numbers mark nothing',()=>{
  const [,board]=compareRows(trips,fields)
  assert.ok(board.cells.every(c=>!c.differs&&!c.best))
  const [single]=compareRows(trips.slice(0,1),fields)
  assert.deepEqual([single.cells[0].best,single.cells[0].delta],[false,null])
  const same=compareRows([{total:1},{total:1}],[{label:'T',value:t=>t.total,better:'low'}])[0]
  assert.ok(same.cells.every(c=>!c.best&&c.delta==null))
})

test('differs marks every cell when the text is not the same',()=>{
  const rows=compareRows([{b:'AI'},{b:'HB'}],[{label:'Board',value:t=>t.b,differs:true}])
  assert.deepEqual(rows[0].cells.map(c=>c.differs),[true,true])
})

test('better high picks the largest number',()=>{
  const [row]=compareRows([{s:9.1},{s:8.4}],[{label:'Score',value:t=>t.s,better:'high'}])
  assert.equal(row.cells[0].best,true)
  assert.ok(Math.abs(row.cells[1].delta-0.7)<1e-9)
})

test('a span is placed in percent of its axis and clipped to it',()=>{
  assert.deepEqual(spanBox({start:6,end:12},{min:0,max:24}),{left:25,width:25})
  assert.deepEqual(spanBox({start:-2,end:3},{min:0,max:24}),{left:0,width:12.5})
})

test('mountCompare draws a column per item with marks, deltas and bars',()=>{
  const root=document.createElement('div')
  const view=mountCompare(root,{items:trips,fields,title:t=>t.name,formatDelta:d=>`+${d} kr`})
  const host=root.querySelector('.tk-compare')
  assert.equal(host.style.getPropertyValue('--tk-compare-n'),'2')
  assert.deepEqual([...root.querySelectorAll('[role="columnheader"] strong')].map(n=>n.textContent),['Beach A','Beach B'])
  assert.equal(root.querySelectorAll('[data-best]').length,1)
  assert.equal(root.querySelector('.tk-compare-delta').textContent,'+3429 kr')
  assert.equal(root.querySelectorAll('.tk-compare-span').length,6)
  assert.equal(root.querySelectorAll('.tk-compare-span[data-kind="gap"]').length,2)
  assert.equal(root.querySelectorAll('.tk-compare-shade').length,4)
  view.update(trips.slice(0,1))
  assert.equal(root.querySelectorAll('[role="columnheader"]').length,1)
  view.destroy()
  assert.equal(root.children.length,0)
})
