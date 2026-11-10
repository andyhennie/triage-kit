// Column widths: the pure maths, and the drag handles on a header row in a DOM.
import {test, before, after} from 'node:test'
import assert from 'node:assert/strict'
import {Window} from 'happy-dom'
import {resizeColumn, columnTemplate, readWidths} from '../src/columns.js'

const window=new Window({url:'http://localhost/'})
let mountColumnResize
before(async()=>{
  for(const key of ['window','document','navigator','HTMLElement','Node','Event','KeyboardEvent','MouseEvent'])
    Object.defineProperty(globalThis,key,{value:key==='window'?window:window[key],configurable:true,writable:true})
  ;({mountColumnResize}=await import('../src/columns.js'))
})
after(()=>window.happyDOM.close())

const memory=(seed={})=>{
  const map=new Map(Object.entries(seed))
  return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)}
}

test('a boundary grows the fixed column on its left, else shrinks the one on its right',()=>{
  const widths=[32,null,150,84]
  assert.deepEqual(resizeColumn(widths,0,10),[42,null,150,84])
  assert.deepEqual(resizeColumn(widths,1,40),[32,null,110,84])
  assert.deepEqual(resizeColumn(widths,2,-30.4),[32,null,120,84])
  assert.deepEqual(resizeColumn(widths,3,-500),[32,null,150,24])
  assert.deepEqual(widths,[32,null,150,84])
  assert.equal(resizeColumn([null,null],0,10)[0],null)
  assert.equal(columnTemplate([42,null,110]),'42px minmax(0, 1fr) 110px')
})

test('saved widths are used only when they still fit the columns',()=>{
  const defaults=[32,null,150]
  assert.deepEqual(readWidths(memory({k:'[40,null,90]'}),'k',defaults),[40,null,90])
  for(const saved of ['[40,null]','[40,50,90]','[null,null,90]','[40,null,-1]','nonsense'])
    assert.deepEqual(readWidths(memory({k:saved}),'k',defaults),defaults)
  assert.deepEqual(readWidths(null,'k',defaults),defaults)
})

function mount(storage=memory()){
  const head=document.createElement('div')
  for(const text of ['Nr','Question','Area','Status','Answer'])head.append(Object.assign(document.createElement('span'),{textContent:text}))
  document.body.replaceChildren(head)
  const applied=[]
  const resize=mountColumnResize(head,{widths:[32,null,150,84],storage,storageKey:'k',apply:template=>applied.push(template)})
  const handle=i=>head.children[i].querySelector('.tk-resize')
  const drag=(i,from,to)=>{
    handle(i).dispatchEvent(new MouseEvent('pointerdown',{clientX:from,bubbles:true,cancelable:true}))
    handle(i).dispatchEvent(new MouseEvent('pointermove',{clientX:to,bubbles:true}))
    handle(i).dispatchEvent(new MouseEvent('pointerup',{clientX:to,bubbles:true}))
  }
  return {head,resize,applied,handle,drag,storage}
}

test('header cells with a resizable boundary get a handle; dragging applies and saves',()=>{
  const {head,resize,applied,handle,drag,storage}=mount()
  assert.deepEqual([0,1,2,3,4].map(i=>!!handle(i)),[true,true,true,true,false])
  assert.equal(applied.at(-1),'32px minmax(0, 1fr) 150px 84px')
  drag(1,500,460)
  assert.deepEqual(resize.widths,[32,null,190,84])
  assert.equal(applied.at(-1),'32px minmax(0, 1fr) 190px 84px')
  assert.equal(storage.getItem('k'),'[32,null,190,84]')
  assert.equal(head.hasAttribute('data-resizing'),false)
  // A move after the drag has ended does nothing.
  handle(1).dispatchEvent(new MouseEvent('pointermove',{clientX:100,bubbles:true}))
  assert.deepEqual(resize.widths,[32,null,190,84])
  // The next mount starts from the saved widths; double-click restores the defaults.
  const again=mount(storage)
  assert.deepEqual(again.resize.widths,[32,null,190,84])
  again.handle(2).dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))
  assert.deepEqual(again.resize.widths,[32,null,150,84])
  assert.equal(storage.getItem('k'),'[32,null,150,84]')
})
