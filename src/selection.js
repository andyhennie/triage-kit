// Selection in a keyboard list (the Triage list contract). State is
// {selection, current, selectionAnchor}; every function returns the next state and leaves
// the given one untouched. ids are the visible rows in order.

export function selectOne(state,id,extend=false){
  const selection=new Set(extend?state.selection:[])
  if(id!=null)selection.add(id)
  return {selection,current:id,selectionAnchor:extend?state.selectionAnchor:id}
}

// Shift: everything between the anchor and id. null when either is not in the list.
export function selectRange(state,ids,id){
  const anchor=state.selectionAnchor??state.current??id,start=ids.indexOf(anchor),end=ids.indexOf(id)
  if(start<0||end<0)return null
  return {selection:new Set(ids.slice(Math.min(start,end),Math.max(start,end)+1)),current:id,selectionAnchor:anchor}
}

export function selectAll(state,ids){
  const current=ids.includes(state.current)?state.current:(ids[0]??null)
  return {selection:new Set(ids),current,selectionAnchor:current}
}

// The row one step up or down from current, held at the ends.
export function stepId(ids,current,delta){
  if(!ids.length)return null
  const index=ids.indexOf(current)
  return ids[Math.max(0,Math.min(ids.length-1,index+delta))]
}

// Where the cursor lands when rows leave the list: the next one below current, else above.
export function nextAfter(ids,current,removed){
  const index=Math.max(0,ids.indexOf(current))
  return ids.slice(index+1).find(id=>!removed.has(id))??ids.slice(0,index).reverse().find(id=>!removed.has(id))??null
}

// ↑↓ move, Shift+↑↓ extend, ⌘A selects every row. Typing in a field is never a list key.
export function listKey(e){
  if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target?.tagName)||e.ctrlKey||e.altKey)return null
  if(e.metaKey)return !e.shiftKey&&e.key.toLowerCase()==='a'?'all':null
  if(!['ArrowDown','ArrowUp'].includes(e.key))return null
  return `${e.shiftKey?'extend':'move'}:${e.key==='ArrowDown'?1:-1}`
}

export function applyListKey(state,ids,action){
  if(action==='all')return selectAll(state,ids)
  const [kind,delta]=action.split(':'),id=stepId(ids,state.current,Number(delta))
  if(id==null)return state
  if(kind==='move')return selectOne(state,id)
  return selectRange({...state,selectionAnchor:state.selectionAnchor??state.current??ids[0]},ids,id)??selectOne(state,id)
}
