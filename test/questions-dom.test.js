// mountQuestions in a DOM: a key is one batch for the selection, decided rows
// leave the open queue and hand the cursor on, U restores, and state survives a remount.
import {test, before, after} from 'node:test'
import assert from 'node:assert/strict'
import {Window} from 'happy-dom'

const window=new Window({url:'http://localhost/'})
let mountQuestions

before(async()=>{
  for(const key of ['window','document','navigator','HTMLElement','Node','Event','KeyboardEvent','MouseEvent'])
    Object.defineProperty(globalThis,key,{value:key==='window'?window:window[key],configurable:true,writable:true})
  ;({mountQuestions}=await import('../src/questions.js'))
})
after(()=>window.happyDOM.close())

function mount(storage=memory()){
  const root=document.createElement('div')
  document.body.replaceChildren(root)
  const api=mountQuestions(root,{title:'Queue',storageKey:'t',storage,comment:true,
    items:['a','b','c','d'].map(id=>({id,title:`Row ${id}`})),
    decisions:[{id:'send',label:'Send',keys:['ArrowRight'],kbd:'→'},{id:'skip',label:'Skip',keys:['ArrowLeft'],kbd:'←'},
      {id:'wrong',label:'Wrong',keys:['4'],kbd:'4',comment:true}]})
  const list=root.querySelector('.tk-list')
  const press=(key,init={},target=list)=>target.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...init}))
  const shown=()=>[...root.querySelectorAll('.tk-row')].map(row=>row.dataset.id)
  const current=()=>root.querySelector('.tk-row[data-current]')?.dataset.id
  return {root,api,list,press,shown,current,storage}
}
function memory(){
  const map=new Map()
  return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)}
}

test('a decision key applies to the selection as one batch and the cursor moves on',()=>{
  const {api,press,shown,current}=mount()
  press('ArrowDown',{shiftKey:true})
  press('ArrowRight')
  assert.deepEqual(api.decisions,{a:'send',b:'send'})
  assert.deepEqual(shown(),['c','d'])
  assert.equal(current(),'c')
  press('ArrowLeft')
  assert.deepEqual(shown(),['d'])
  press('u')
  assert.deepEqual(api.decisions,{a:'send',b:'send'})
  press('u')
  assert.deepEqual(api.decisions,{})
  assert.deepEqual(shown(),['a','b','c','d'])
})

test('a held decision key runs once, and keys on a button or in the comment are left alone',()=>{
  const {root,api,press,current}=mount()
  press('ArrowRight')
  press('ArrowRight',{repeat:true})
  assert.deepEqual(api.decisions,{a:'send'})
  press('ArrowRight',{},root.querySelector('.qs-decisions button'))
  press('Enter')
  assert.equal(document.activeElement,root.querySelector('.qs-comment'))
  press('ArrowRight',{},root.querySelector('.qs-comment'))
  assert.deepEqual(api.decisions,{a:'send'})
  assert.equal(current(),'b')
})

test('Ctrl+arrows step the queue tabs and decisions survive a remount',()=>{
  const first=mount()
  first.press('ArrowRight')
  first.press('ArrowRight',{ctrlKey:true})
  assert.deepEqual(first.shown(),['a'])
  assert.equal(first.root.querySelector('nav button[aria-pressed="true"]').firstChild.textContent,'Send')
  const again=mount(first.storage)
  assert.deepEqual(again.api.decisions,{a:'send'})
  assert.deepEqual(again.shown(),['b','c','d'])
  again.press('u')
  assert.deepEqual(again.api.decisions,{})
})

test('an answer that asks for a comment keeps its row in place with the comment open until Esc',()=>{
  const {root,api,list,press,shown,current}=mount()
  press('4')
  assert.deepEqual(shown(),['a','b','c','d'])
  const note=root.querySelector('.tk-row[data-id="a"] .qs-comment')
  assert.equal(document.activeElement,note)
  note.value='not like that'
  note.dispatchEvent(new Event('input',{bubbles:true}))
  assert.deepEqual(api.comments,{a:'not like that'})
  press('Escape',{},note)
  assert.equal(document.activeElement,list)
  assert.deepEqual(shown(),['b','c','d'])
  assert.equal(current(),'b')
  assert.deepEqual(api.rows()[0],{id:'a',title:'Row a',decision:'wrong',comment:'not like that'})
})

test('the answer buttons are in the row, answer on click and are not tab stops',()=>{
  const {root,api,shown}=mount()
  const button=root.querySelectorAll('.tk-row[data-id="c"] .qs-decisions button')[1]
  assert.equal(button.getAttribute('tabindex'),'-1')
  button.dispatchEvent(new MouseEvent('click',{bubbles:true}))
  assert.deepEqual(api.decisions,{c:'skip'})
  assert.deepEqual(shown(),['a','b','d'])
  assert.equal(root.querySelector('.tk-inspector'),null)
})
