// Column widths the user can drag, for any list on the list.css grid. Widths are an array in
// column order: a number is a fixed width in px, null is a flexible column that takes the
// rest. The maths is pure; mountColumnResize wires handles on a .tk-head row to it.

// The boundary after column `index` moved by dx px. A fixed column on its left grows with
// it; when that one is flexible, the fixed column on its right shrinks instead.
export function resizeColumn(widths,index,dx,min=24){
  const next=[...widths]
  if(widths[index]!=null)next[index]=Math.max(min,Math.round(widths[index]+dx))
  else if(widths[index+1]!=null)next[index+1]=Math.max(min,Math.round(widths[index+1]-dx))
  else return widths
  return next
}

// The widths as a grid-template-columns value.
export const columnTemplate=widths=>widths.map(width=>width==null?'minmax(0, 1fr)':`${width}px`).join(' ')

// Saved widths, when they still fit the defaults (same columns, same flexible ones); else the defaults.
export function readWidths(storage,key,defaults){
  try{
    const saved=JSON.parse(storage?.getItem(key))
    if(Array.isArray(saved)&&saved.length===defaults.length&&
      saved.every((width,i)=>width==null?defaults[i]==null:defaults[i]!=null&&Number.isFinite(width)&&width>0))return saved
  }catch{}
  return [...defaults]
}

// Adds a drag handle to the right edge of each header cell that has a resizable boundary.
// apply(template, widths) is called on every change; set the grid columns there. Widths are
// saved under storageKey when a drag ends. Double-click a handle to go back to the defaults.
export function mountColumnResize(head,{widths:defaults,storage,storageKey,min=24,apply,label='Drag to resize, double-click to reset'}){
  let widths=readWidths(storage,storageKey,defaults)
  const set=(next,save)=>{
    widths=next
    apply(columnTemplate(next),[...next])
    if(save)try{storage?.setItem(storageKey,JSON.stringify(next))}catch{}
  }
  ;[...head.children].forEach((cell,index)=>{
    if(index>=defaults.length||(defaults[index]==null&&defaults[index+1]==null))return
    const handle=document.createElement('span')
    handle.className='tk-resize'
    handle.title=label
    handle.addEventListener('pointerdown',down=>{
      if(down.button)return
      down.preventDefault()
      const start=widths
      handle.setPointerCapture?.(down.pointerId)
      head.setAttribute('data-resizing','')
      const move=e=>set(resizeColumn(start,index,e.clientX-down.clientX,min),false)
      const end=()=>{
        for(const [type,listener] of [['pointermove',move],['pointerup',end],['pointercancel',end]])handle.removeEventListener(type,listener)
        head.removeAttribute('data-resizing')
        set(widths,true)
      }
      handle.addEventListener('pointermove',move)
      handle.addEventListener('pointerup',end)
      handle.addEventListener('pointercancel',end)
    })
    handle.addEventListener('dblclick',()=>set([...defaults],true))
    cell.append(handle)
  })
  set(widths,false)
  return {get widths(){return [...widths]},reset(){set([...defaults],true)}}
}
