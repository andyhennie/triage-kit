// Cases from Superføring, the second follower of the contract.
import test from 'node:test'
import assert from 'node:assert/strict'
import {reconcile,afterAction,listKey} from '../src/selection.js'

const ids=[1,2,3,4]

test('a filtered list keeps the selected rows that are still shown',()=>{
  const state={selection:new Set([2,3]),current:3,selectionAnchor:2}
  assert.deepEqual(reconcile(state,[1,2,4]),{selection:new Set([2]),current:2,selectionAnchor:2})
  assert.deepEqual(reconcile(state,[1,4]),{selection:new Set([1]),current:1,selectionAnchor:1})
  assert.deepEqual(reconcile(state,[]),{selection:new Set(),current:null,selectionAnchor:null})
})

test('after a batch the cursor moves on like Triage, and refused rows stay selected',()=>{
  const selection=new Set([2,3])
  assert.deepEqual(afterAction({ids,current:3,selection,left:[2,3]}),{selection:new Set([4]),current:4,selectionAnchor:4})
  assert.deepEqual(afterAction({ids,current:4,selection:new Set([3,4]),left:[3,4]}),{selection:new Set([2]),current:2,selectionAnchor:2})
  assert.deepEqual(afterAction({ids,current:3,selection,left:[]}),{selection,current:3,selectionAnchor:3},'rows that stay in the list stay selected')
  assert.deepEqual(afterAction({ids,current:2,selection,left:[2],refused:[3]}),{selection:new Set([3]),current:3,selectionAnchor:3})
  assert.deepEqual(afterAction({ids,current:2,selection:new Set([2]),affected:new Set([2,3]),left:[2]}),{selection:new Set([4]),current:4,selectionAnchor:4},
    'the cursor skips every row the batch was for')
  assert.deepEqual(afterAction({ids,current:1,selection:new Set(ids),left:ids}),{selection:new Set(),current:null,selectionAnchor:null})
})

test('the Shift anchor survives a batch that keeps the cursor, and a skipped row can take the cursor',()=>{
  assert.deepEqual(afterAction({ids,current:3,selection:new Set([2,3]),selectionAnchor:2,left:[]}),{selection:new Set([2,3]),current:3,selectionAnchor:2})
  assert.deepEqual(afterAction({ids,current:3,selection:new Set([3]),selectionAnchor:9,left:[]}).selectionAnchor,3,'an anchor no longer shown falls back to the cursor')
  // Rows 1 and 2 selected, cursor 1; only 1 was decided (2 had no usable proposal) and left.
  assert.equal(afterAction({ids,current:1,selection:new Set([1,2]),affected:new Set([1]),left:[1]}).current,2)
  assert.equal(afterAction({ids,current:1,selection:new Set([1,2]),left:[1]}).current,3,'default: every selected row counts as affected')
})

test('a focused <summary> keeps its keys, like a button',()=>{
  assert.equal(listKey({key:'ArrowDown',target:{tagName:'SUMMARY'}}),null)
})
