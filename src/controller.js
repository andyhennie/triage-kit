// The list's whole client state as one pure reducer, so the React hook (and any other
// framework) only wires events to it. State: {sel, history, toast, busy, before}.
import {reconcile,applyListKey,selectOne,selectRange,afterAction} from './selection.js'

export const HISTORY_LIMIT=50
const emptySel={selection:new Set(),current:null,selectionAnchor:null}

export const initialTriage=(ids=[])=>({sel:reconcile(emptySel,ids),history:[],toast:'',busy:false,before:null})

// event: {type:'ids', ids} | {type:'list', ids, arg} | {type:'click', ids, id, shift}
//      | {type:'start', ids, label, affected, left} | {type:'done', label, record, undone}
//      | {type:'fail', message, stale, ids} | {type:'reset', ids} | {type:'toast', toast}
export function triageReducer(state,event){
  const {sel}=state
  switch(event.type){
    case 'ids':return {...state,sel:reconcile(sel,event.ids)}
    // A queue change starts a fresh selection, and an old request must not restore into it.
    case 'reset':return {...state,sel:reconcile(emptySel,event.ids),before:null}
    case 'list':return {...state,sel:applyListKey(sel,event.ids,event.arg)}
    case 'click':return {...state,sel:event.shift?selectRange(sel,event.ids,event.id)??selectOne(sel,event.id):selectOne(sel,event.id)}
    case 'start':{
      // One batch at a time: a press while one is in flight is dropped (and must not pop history).
      if(state.busy)return state
      const affected=new Set(event.affected??sel.selection),left=event.left??[]
      return {...state,busy:true,before:sel,toast:`${event.label} …`,
        sel:afterAction({ids:event.ids,current:sel.current,selection:sel.selection,selectionAnchor:sel.selectionAnchor,affected,left})}
    }
    case 'done':{
      let history=state.history
      if(event.undone)history=history.slice(0,-1)
      if(event.record?.length)history=[...history,{items:event.record}].slice(-HISTORY_LIMIT)
      return {...state,busy:false,before:null,history,toast:`${event.label} ✓`}
    }
    // Restore the pre-action selection, but only the rows still shown (the list may have reloaded).
    case 'fail':{
      const back=event.stale||!state.before?sel:state.before
      return {...state,busy:false,sel:event.ids?reconcile(back,event.ids):back,before:null,toast:event.message}
    }
    case 'toast':return {...state,toast:event.toast}
    default:return state
  }
}
