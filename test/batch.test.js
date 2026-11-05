import test from 'node:test'
import assert from 'node:assert/strict'
import {batchFor,undoOf,MAX_BATCH} from '../src/batch.js'

const rows=[
  {id:'a',proposal:'keep',decision:null},
  {id:'b',proposal:'check',decision:null},
  {id:'c',proposal:'trash',decision:'keep'},
  {id:'d',proposal:null,decision:null},
]

test('a batch covers the selection in list order and never guesses',()=>{
  const sel=new Set(['d','c','b','a'])
  const own=batchFor(rows,sel,undefined,{usable:p=>p!=null&&p!=='check'})
  assert.deepEqual(own.items,[{id:'a',decision:'keep',previous:null},{id:'c',decision:'trash',previous:'keep'}])
  assert.deepEqual(own.skipped,['b','d'])
  assert.deepEqual(batchFor(rows,sel).skipped,['d'],'default: any non-null proposal is usable')
  const set=batchFor(rows,new Set(['a','c']),'keep')
  assert.deepEqual(set.items,[{id:'a',decision:'keep',previous:null}],'rows already at the target are left out')
  assert.deepEqual(undoOf(own),[{id:'a',decision:null},{id:'c',decision:'keep'}])
})

test('more than 500 rows is flagged, not cut',()=>{
  const many=Array.from({length:MAX_BATCH+1},(_,i)=>({id:i,proposal:'keep'}))
  const b=batchFor(many,new Set(many.map(r=>r.id)))
  assert.equal(b.items.length,501)
  assert.equal(b.tooMany,true)
  assert.equal(batchFor(many.slice(0,500),new Set(many.map(r=>r.id))).tooMany,false)
})
