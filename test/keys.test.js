import test from 'node:test'
import assert from 'node:assert/strict'
import {routeKey} from '../src/keys.js'

const ev=(key,extra={})=>({key,target:{tagName:'DIV'},...extra})
const on=tagName=>({target:{tagName}})
const act=(key,extra,config)=>routeKey(ev(key,extra),config)?.action??null

test('the generic keys',()=>{
  assert.deepEqual(routeKey(ev('ArrowDown')),{action:'list',arg:'move:1',repeat:true})
  assert.deepEqual(routeKey(ev('ArrowUp',{shiftKey:true})),{action:'list',arg:'extend:-1',repeat:true})
  assert.deepEqual(routeKey(ev('a',{metaKey:true})),{action:'list',arg:'all',repeat:false},'⌘A never repeats')
  assert.deepEqual(routeKey(ev('u')),{action:'undo',repeat:true},'held U undoes one more each time')
  assert.deepEqual(routeKey(ev('o')),{action:'open',repeat:false})
  assert.deepEqual(routeKey(ev('Enter')),{action:'inspect',repeat:false})
  assert.equal(act('x'),null,'unknown keys are not swallowed')
  assert.equal(act('U',{shiftKey:true}),null)
})

test('modal layers, IME and rich text own the keyboard',()=>{
  assert.equal(act('ArrowDown',{},{modal:true}),null)
  assert.equal(act('ArrowDown',{isComposing:true}),null)
  assert.equal(act('u',{target:{tagName:'DIV',isContentEditable:true}}),null)
})

test('fields and controls keep their keys; Ctrl+←→ still works on a button',()=>{
  for(const tag of ['INPUT','SELECT','TEXTAREA','BUTTON','SUMMARY']){
    assert.equal(act('ArrowDown',on(tag)),null,tag)
    assert.equal(act('Enter',on(tag)),null,tag)
    assert.equal(act('1',on(tag),{keys:{1:'set:a'}}),null,tag)
  }
  assert.equal(act('a',{metaKey:true,...on('INPUT')}),null,'⌘A selects text in a field')
  assert.deepEqual(routeKey(ev('ArrowRight',{ctrlKey:true,...on('BUTTON')}),{queues:true}),{action:'queue',arg:1,repeat:true})
  assert.equal(act('ArrowRight',{ctrlKey:true,...on('INPUT')},{queues:true}),null)
})

test('queues, domain keys and approve list are opt-in',()=>{
  assert.equal(act('ArrowLeft'),null,'no queues: plain ← is not ours')
  assert.deepEqual(routeKey(ev('ArrowLeft'),{queues:true}),{action:'queue',arg:-1,repeat:true})
  assert.equal(act('ArrowLeft',{},{queues:true,keys:{ArrowLeft:'skip'}}),'skip','a decision bound to ← wins over the queue step')
  assert.deepEqual(routeKey(ev('S',{shiftKey:true}),{keys:{S:'pick-later'}}),{action:'pick-later',repeat:false},'Shift-only domain keys')
  assert.equal(act('s',{ctrlKey:true},{keys:{s:'later'}}),null,'never Ctrl or Alt letters')
  assert.equal(act('Enter',{metaKey:true}),null)
  assert.deepEqual(routeKey(ev('Enter',{metaKey:true}),{approveList:true}),{action:'approveList',repeat:false})
  assert.equal(act('Enter',{ctrlKey:true},{approveList:true}),'approveList','Ctrl+↵ where Super is the window manager')
  assert.equal(act('Enter',{metaKey:true,...on('INPUT')},{approveList:true}),'approveList','also from a search field')
  assert.equal(act('Enter',{metaKey:true,...on('TEXTAREA')},{approveList:true}),null)
  assert.equal(act('Enter',{},{enter:'approve'}),'approve','a follower may bind Enter to its main action')
  assert.equal(act('o',{},{open:false}),null)
})
