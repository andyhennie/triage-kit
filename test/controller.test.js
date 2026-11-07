import test from 'node:test'
import assert from 'node:assert/strict'
import {initialTriage,triageReducer,HISTORY_LIMIT} from '../src/controller.js'

const ids=['a','b','c','d']
const reduce=(state,...events)=>events.reduce(triageReducer,state)
const cur=s=>[[...s.sel.selection],s.sel.current]

test('starts on the first row; keys and clicks move the selection',()=>{
  let s=initialTriage(ids)
  assert.deepEqual(cur(s),[['a'],'a'])
  s=reduce(s,{type:'list',ids,arg:'extend:1'},{type:'list',ids,arg:'extend:1'})
  assert.deepEqual(cur(s),[['a','b','c'],'c'])
  s=reduce(s,{type:'click',ids,id:'d'})
  assert.deepEqual(cur(s),[['d'],'d'])
  s=reduce(s,{type:'click',ids,id:'b',shift:true})
  assert.deepEqual(cur(s),[['b','c','d'],'b'])
})

test('a batch moves the cursor at once, and the result or an error follows',()=>{
  let s=reduce(initialTriage(ids),{type:'click',ids,id:'b'},{type:'click',ids,id:'c',shift:true})
  s=triageReducer(s,{type:'start',ids,label:'Keep 2',left:['b','c']})
  assert.deepEqual(cur(s),[['d'],'d'],'optimistic: next untouched row below')
  assert.equal(s.toast,'Keep 2 …')
  assert.equal(s.busy,true)
  const failed=triageReducer(s,{type:'fail',message:'Offline'})
  assert.deepEqual(cur(failed),[['b','c'],'c'],'error restores the selection')
  assert.equal(failed.toast,'Offline')
  const done=triageReducer(s,{type:'done',label:'Keep 2',record:[{id:'b',decision:'keep',previous:null}]})
  assert.equal(done.history.length,1)
  assert.equal(done.busy,false)
  assert.equal(done.toast,'Keep 2 ✓')
})

test('a press while busy is dropped; undo pops history only when done',()=>{
  let s=reduce(initialTriage(ids),{type:'start',ids,label:'one',left:[]},{type:'done',label:'one',record:[{id:'a',decision:'x',previous:null}]})
  s=triageReducer(s,{type:'start',ids,label:'Undo',left:[]})
  assert.equal(triageReducer(s,{type:'start',ids,label:'Undo',left:[]}),s,'second press while busy changes nothing')
  assert.equal(s.history.length,1,'still in history while the undo is in flight')
  assert.equal(triageReducer(s,{type:'fail',message:'x'}).history.length,1,'a failed undo keeps the batch')
  assert.equal(triageReducer(s,{type:'done',label:'Undo',undone:true}).history.length,0)
})

test('rows that stay keep cursor and anchor; history is capped',()=>{
  let s=reduce(initialTriage(ids),{type:'click',ids,id:'b'},{type:'click',ids,id:'c',shift:true})
  s=reduce(s,{type:'start',ids,label:'x',left:[]})
  assert.deepEqual([cur(s),s.sel.selectionAnchor],[[['b','c'],'c'],'b'])
  let h=initialTriage(ids)
  for(let i=0;i<HISTORY_LIMIT+5;i++)h=reduce(h,{type:'start',ids,label:'x'},{type:'done',label:'x',record:[{id:'a',decision:i,previous:null}]})
  assert.equal(h.history.length,HISTORY_LIMIT)
  assert.equal(h.history.at(-1).items[0].decision,HISTORY_LIMIT+4)
})

test('reconcile after the visible rows change',()=>{
  const s=reduce(initialTriage(ids),{type:'click',ids,id:'c'},{type:'ids',ids:['a','b']})
  assert.deepEqual(cur(s),[['a'],'a'])
})

test('a queue change resets the selection, and a stale failure does not restore into it',()=>{
  let s=reduce(initialTriage(ids),{type:'click',ids,id:'c'},{type:'start',ids,label:'x',left:['c']})
  s=triageReducer(s,{type:'reset',ids:['p','q']})
  assert.deepEqual(cur(s),[['p'],'p'])
  assert.deepEqual(cur(triageReducer(s,{type:'fail',message:'late',stale:true})),[['p'],'p'])
})
