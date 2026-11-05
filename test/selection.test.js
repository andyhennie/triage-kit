import test from 'node:test'
import assert from 'node:assert/strict'
import {selectOne,selectRange,selectAll,stepId,nextAfter,listKey,applyListKey} from '../src/selection.js'

const start={selection:new Set([2]),current:2,selectionAnchor:2}
const ids=[1,2,3,4]

test('one row, a range from the anchor, or every row',()=>{
  assert.deepEqual(selectOne(start,3),{selection:new Set([3]),current:3,selectionAnchor:3})
  assert.deepEqual(selectOne(start,3,true),{selection:new Set([2,3]),current:3,selectionAnchor:2})
  assert.deepEqual(selectRange(start,ids,4),{selection:new Set([2,3,4]),current:4,selectionAnchor:2})
  assert.equal(selectRange(start,ids,9),null)
  assert.deepEqual(selectAll({...start,current:9},ids),{selection:new Set(ids),current:1,selectionAnchor:1})
  assert.deepEqual([...start.selection],[2],'the given state is not changed')
})

test('arrows stop at the ends and the cursor skips rows that left',()=>{
  assert.equal(stepId(ids,4,1),4)
  assert.equal(stepId(ids,1,-1),1)
  assert.equal(stepId([],1,1),null)
  assert.equal(nextAfter(ids,2,new Set([2,3])),4)
  assert.equal(nextAfter(ids,4,new Set([3,4])),2)
  assert.equal(nextAfter(ids,1,new Set(ids)),null)
})

test('the same keys drive every list',()=>{
  const key=(k,extra={})=>listKey({key:k,target:{tagName:'DIV'},...extra})
  assert.deepEqual([key('ArrowDown'),key('ArrowUp',{shiftKey:true}),key('a',{metaKey:true}),key('a'),key('ArrowDown',{target:{tagName:'INPUT'}})],
    ['move:1','extend:-1','all',null,null])
  let state=applyListKey(start,ids,'extend:1');state=applyListKey(state,ids,'extend:1')
  assert.deepEqual([[...state.selection],state.current],[[2,3,4],4])
  state=applyListKey(state,ids,'move:-1')
  assert.deepEqual([[...state.selection],state.current],[[3],3])
})
