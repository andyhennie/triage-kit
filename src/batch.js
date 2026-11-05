// One key press is one batch for the selection. Rows without a usable proposal are never
// guessed; they are reported as skipped. Undo restores each row's previous decision.
export const MAX_BATCH=500

// rows: [{id, proposal?, decision?}] in list order; decision: the value to set, or
// undefined to apply each row's own proposal when usable(proposal).
export function batchFor(rows,selection,decision,{usable=p=>p!=null}={}){
  const items=[],skipped=[]
  for(const r of rows){
    if(!selection.has(r.id))continue
    const d=decision??(usable(r.proposal)?r.proposal:null)
    if(d==null){skipped.push(r.id);continue}
    if(d!==r.decision)items.push({id:r.id,decision:d,previous:r.decision??null})
  }
  return {items,skipped,tooMany:items.length>MAX_BATCH}
}

export const undoOf=batch=>batch.items.map(i=>({id:i.id,decision:i.previous}))
