// The classic bundle exposes exactly the package's core API and behave like src/.
import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import * as src from '../src/index.js'

const global=createRequire(import.meta.url)('../dist/global/triage-kit.global.js')

test('the bundles carry the whole core API',()=>{
  assert.deepEqual(Object.keys(global).sort(),Object.keys(src).sort())
  assert.equal(globalThis.TriageKit,global)
})

test('the bundles behave like the sources',()=>{
  for(const k of [global]){
    assert.equal(k.routeKey({key:'ArrowDown',target:{tagName:'DIV'}}).arg,'move:1')
    assert.equal(k.nextAfter([1,2,3,4],2,new Set([2,3])),4)
    assert.equal(k.triageReducer(k.initialTriage(['a']),{type:'toast',toast:'x'}).toast,'x')
  }
})
