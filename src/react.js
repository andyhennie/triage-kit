// useTriageList: the Triage list contract as a React hook. All state changes go through
// the pure triageReducer; the hook wires keys, clicks, the server call and focus.
import {useCallback,useEffect,useReducer,useRef} from 'react'
import {initialTriage,triageReducer} from './controller.js'
import {routeKey} from './keys.js'
import {undoOf} from './batch.js'

const IGNORE_CLICK='button,a,input,select,textarea,summary,[data-triage-ignore]'

// options: {ids, commit(items) → Promise, onAction(route, api) → false when not handled,
//   onUndo(api) (the app owns undo, e.g. a server batch id; omit for the local stack),
//   queue (identity of the current queue; a change resets the selection),
//   global (listen on window, so Ctrl+←→ works from sibling controls), idPrefix,
//   and the routeKey config: keys, enter, queues, open, approveList, modal}
export function useTriageList({ids,commit,onAction,onUndo,queue,global=false,idPrefix='triage-',...routing}){
  const [state,dispatch]=useReducer(triageReducer,ids,initialTriage)
  const listRef=useRef(null)
  const inFlight=useRef(false) // synchronous: two presses in one frame start one request
  const generation=useRef(0)
  const live=useRef({})
  live.current={ids,state,commit,onAction,onUndo,routing}

  const idsKey=ids.join('\u0000')
  useEffect(()=>{dispatch({type:'ids',ids})},[idsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const first=useRef(true)
  useEffect(()=>{
    if(first.current){first.current=false;return}
    generation.current++;dispatch({type:'reset',ids:live.current.ids})
  },[queue])
  const current=state.sel.current
  useEffect(()=>{if(current!=null)document.getElementById(idPrefix+current)?.scrollIntoView?.({block:'nearest'})},[current,idPrefix])

  const focus=useCallback(()=>listRef.current?.focus({preventScroll:true}),[])
  const setToast=useCallback(text=>dispatch({type:'toast',toast:text}),[])

  // One request with the whole lifecycle: optimistic cursor, pending toast, the call, then the
  // result or a restore (reconciled with the rows shown now); focus returns either way.
  const perform=useCallback(async(call,{label,left=[],affected,record,undone})=>{
    if(inFlight.current)return false
    inFlight.current=true
    const gen=generation.current
    dispatch({type:'start',ids:live.current.ids,label,left,affected})
    try{
      const result=await call()
      dispatch({type:'done',label:typeof result==='string'?result:label,record,undone})
      return true
    }catch(e){
      dispatch({type:'fail',message:e?.message??String(e),stale:gen!==generation.current,ids:live.current.ids})
      return false
    }finally{inFlight.current=false;focus()}
  },[focus])

  // One batch. record: what the local undo stack should restore later.
  const run=useCallback((items,options={})=>{
    if(!items?.length)return Promise.resolve(false)
    return perform(()=>live.current.commit(items),options)
  },[perform])

  // U. Local stack (a documented deviation from durable server history): replay the
  // previous decisions; rows come back, nothing leaves, so cursor and selection stay.
  const undo=useCallback((label=n=>`Undone ${n}`)=>{
    const {state,onUndo}=live.current
    if(inFlight.current)return false
    // App-owned undo (e.g. a server batch id): same busy, error and focus handling as a batch.
    if(onUndo)return perform(()=>onUndo(api()),{label:typeof label==='function'?'Undone':label,undone:true})
    const last=state.history.at(-1)
    if(!last){setToast('Nothing to undo');return false}
    return run(undoOf(last),{label:typeof label==='function'?label(last.items.length):label,undone:true})
  },[run,perform,setToast]) // eslint-disable-line react-hooks/exhaustive-deps

  const api=()=>({state:live.current.state,run,undo,toast:setToast,focus})

  const onKey=useCallback(e=>{
    const {ids,onAction,routing}=live.current
    const route=routeKey(e,routing)
    if(!route)return
    if(e.repeat&&!route.repeat){e.preventDefault();return}
    if(route.action==='list'){e.preventDefault();dispatch({type:'list',ids,arg:route.arg});focus();return}
    if(route.action==='undo'){e.preventDefault();undo();return}
    // Only a handler that exists and does not return false owns the key.
    if(onAction&&onAction(route,api())!==false)e.preventDefault()
  },[undo,focus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    if(!global)return
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[global,onKey])

  const onMouseDown=useCallback((e,id)=>{
    if(e.ctrlKey||e.button!==0||e.target?.closest?.(IGNORE_CLICK))return
    dispatch({type:'click',ids:live.current.ids,id,shift:e.shiftKey})
    e.preventDefault() // keep the browser from moving focus; the list takes it
    focus()
  },[focus])

  const listProps={
    ref:listRef,role:'listbox','aria-multiselectable':true,tabIndex:0,
    'aria-activedescendant':current!=null?idPrefix+current:undefined,
    onKeyDown:global?undefined:e=>onKey(e.nativeEvent),
  }
  const rowProps=id=>({
    id:idPrefix+id,role:'option','aria-selected':state.sel.selection.has(id),
    'data-current':current===id?'':undefined,onMouseDown:e=>onMouseDown(e,id),
  })
  return {state,selection:state.sel.selection,current,toast:state.toast,busy:state.busy,
    history:state.history,listProps,rowProps,run,undo,focus,setToast,dispatch}
}
