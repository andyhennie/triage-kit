// Mounted TriageWorkbench in a DOM: the app holds state with the core functions and the
// workbench wires clicks, keys, focus and the active descendant.
import {test, before, after} from 'node:test'
import assert from 'node:assert/strict'
import {Window} from 'happy-dom'

const window=new Window({url:'http://localhost/'})
let React,createRoot,act,TriageWorkbench,core

before(async()=>{
  for(const key of ['window','document','navigator','HTMLElement','Node','Event','KeyboardEvent','MouseEvent'])
    Object.defineProperty(globalThis,key,{value:key==='window'?window:window[key],configurable:true,writable:true})
  globalThis.IS_REACT_ACT_ENVIRONMENT=true
  React=await import('react')
  ;({createRoot}=await import('react-dom/client'))
  ;({act}=React)
  ;({TriageWorkbench}=await import('../src/workbench.js'))
  core=await import('../src/index.js')
})
after(()=>window.happyDOM.close())

function mount(){
  const ids=['a','b','c','d']
  const {createElement:h,useState,useRef}=React
  function App(){
    const [sel,setSel]=useState(()=>core.reconcile({selection:new Set(),current:null,selectionAnchor:null},ids))
    const listRef=useRef(null)
    return h(TriageWorkbench,{
      title:'Queue',listRef,rows:ids.map(id=>({id,title:`Row ${id}`,leading:id,trailing:'1'})),
      selection:sel.selection,current:sel.current,
      onSelect:(id,extend)=>setSel(s=>extend?core.selectRange(s,ids,id)??core.selectOne(s,id):core.selectOne(s,id)),
      onKeyDown:e=>{
        const route=core.routeKey(e)
        if(route?.action!=='list')return
        e.preventDefault()
        setSel(s=>core.applyListKey(s,ids,route.arg))
      },
      inspector:h('h1',null,`Inspecting ${sel.current}`),
    })
  }
  const container=document.createElement('div')
  document.body.append(container)
  const root=createRoot(container)
  act(()=>root.render(h(App)))
  const list=container.querySelector('.tk-list')
  const row=id=>[...container.querySelectorAll('.tk-row')].find(r=>r.textContent.startsWith(id))
  const selected=()=>[...container.querySelectorAll('.tk-row[aria-selected="true"]')].map(r=>r.textContent[0])
  const down=(el,init={})=>act(()=>{el.dispatchEvent(new window.MouseEvent('mousedown',{bubbles:true,button:0,...init}))})
  const key=(k,init={})=>act(()=>{list.dispatchEvent(new window.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...init}))})
  return {container,list,row,selected,down,key,unmount:()=>act(()=>root.unmount())}
}

test('click, Shift-click, arrows and Shift-arrows drive selection; Ctrl-click does not',()=>{
  const ui=mount()
  assert.deepEqual(ui.selected(),['a'])
  assert.equal(ui.list.getAttribute('aria-activedescendant'),ui.row('a').id)

  ui.down(ui.row('c'))
  assert.deepEqual(ui.selected(),['c'])
  assert.equal(ui.list.getAttribute('aria-activedescendant'),ui.row('c').id)
  assert.equal(document.activeElement,ui.list,'a row click focuses the list')
  assert.match(ui.container.querySelector('.tk-inspector').textContent,/Inspecting c/)

  ui.down(ui.row('a'),{shiftKey:true})
  assert.deepEqual(ui.selected(),['a','b','c'])

  ui.down(ui.row('d'),{ctrlKey:true})
  assert.deepEqual(ui.selected(),['a','b','c'],'Ctrl-click belongs to the context menu')
  ui.down(ui.row('d'),{metaKey:true})
  assert.deepEqual(ui.selected(),['a','b','c'])

  ui.key('ArrowDown')
  assert.deepEqual(ui.selected(),['b'])
  ui.key('ArrowDown',{shiftKey:true})
  assert.deepEqual(ui.selected(),['b','c'])
  assert.equal(ui.list.getAttribute('aria-activedescendant'),ui.row('c').id)
  ui.unmount()
})

test('clicks on controls inside a row leave the selection alone',()=>{
  const ui=mount()
  const button=document.createElement('button')
  ui.row('d').querySelector('.tk-cell').append(button)
  ui.down(button)
  assert.deepEqual(ui.selected(),['a'])
  ui.unmount()
})
