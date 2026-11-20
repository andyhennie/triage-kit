// Side-by-side comparison of the selected rows: one column per item, one line per field, so
// the differences that decide between them line up. compareRows is pure; mountCompare draws
// it into a DOM node (an inspector pane, say) with no framework. Show it when ↵ (inspect) is
// pressed with more than one row selected, and the single-item inspector otherwise.
//
// A field: {id, label, value(item), format?(value,item), better?:'low'|'high', differs?:true,
//           spans?(item), axis?:{min, max, ticks?, shade?:[[from,to]]}}
// - better: the best value(s) are marked and every other cell gets its distance to the best.
// - differs: cells whose text is not the same in every column are marked.
// - spans: bars on one shared axis per field ({start, end, kind?, label?}; kind 'gap' is drawn
//   hatched), e.g. flights and layovers on a 24 h day, or phases on a timeline.

const isNum=v=>typeof v==='number'&&Number.isFinite(v)

// [{id, label, cells:[{text, value, best, delta, differs, spans}]}], one cell per item in order.
// Marks need at least two items and a real difference: equal values mark nothing.
export function compareRows(items,fields){
  return fields.map(field=>{
    const values=items.map(item=>field.value?field.value(item):undefined)
    const texts=values.map((value,i)=>value==null?'':String(field.format?field.format(value,items[i]):value))
    const nums=values.filter(isNum)
    let best=null
    if(field.better&&items.length>1&&nums.length>1&&Math.min(...nums)!==Math.max(...nums))
      best=field.better==='high'?Math.max(...nums):Math.min(...nums)
    const differs=!!field.differs&&items.length>1&&new Set(texts).size>1
    return {id:field.id??field.label,label:field.label,cells:items.map((item,i)=>({
      text:texts[i],value:values[i],
      best:best!=null&&values[i]===best,
      delta:best!=null&&isNum(values[i])&&values[i]!==best?Math.abs(values[i]-best):null,
      differs,
      spans:field.spans?field.spans(item)??[]:null,
    }))}
  })
}

// Where a span sits on its axis, in percent of the track; clipped to the axis.
export function spanBox({start,end},{min=0,max=24}={}){
  const range=max-min||1,clip=v=>Math.min(max,Math.max(min,v))
  const left=(clip(start)-min)/range*100,right=(clip(end)-min)/range*100
  return {left,width:Math.max(0,right-left)}
}

const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=text;return node}

// config: {items, fields, title(item), subtitle?(item), formatDelta?(delta,field), labels?:{label}}
// Returns {update(items), destroy()}.
export function mountCompare(root,{items,fields,title=item=>String(item.id),subtitle,formatDelta=d=>`+${d}`,labels={}}){
  const host=el('div','tk-compare')
  host.setAttribute('role','table')
  host.setAttribute('aria-label',labels.label??'Comparison')
  root.append(host)
  const fieldById=new Map(fields.map(f=>[f.id??f.label,f]))
  const render=list=>{
    host.replaceChildren()
    host.style.setProperty('--tk-compare-n',String(list.length))
    const head=el('div','tk-compare-row tk-compare-head')
    head.setAttribute('role','row')
    head.append(el('span','tk-compare-label'))
    for(const item of list){
      const cell=el('span','tk-compare-cell')
      cell.setAttribute('role','columnheader')
      cell.append(el('strong',null,title(item)))
      if(subtitle)cell.append(el('span','tk-muted',subtitle(item)))
      head.append(cell)
    }
    host.append(head)
    for(const row of compareRows(list,fields)){
      const field=fieldById.get(row.id),line=el('div','tk-compare-row')
      line.setAttribute('role','row')
      const label=el('span','tk-compare-label',row.label)
      label.setAttribute('role','rowheader')
      line.append(label)
      for(const c of row.cells){
        const cell=el('span','tk-compare-cell')
        cell.setAttribute('role','cell')
        if(c.best)cell.dataset.best=''
        if(c.differs)cell.dataset.differs=''
        if(c.spans)cell.append(track(c.spans,field.axis))
        if(c.text)cell.append(el('span','tk-compare-value',c.text))
        if(c.delta!=null)cell.append(el('span','tk-compare-delta',formatDelta(c.delta,field)))
        line.append(cell)
      }
      host.append(line)
    }
  }
  const track=(spans,axis={})=>{
    const box=el('span','tk-compare-track')
    for(const range of axis.shade??[]){const s=el('span','tk-compare-shade');place(s,{start:range[0],end:range[1]},axis);box.append(s)}
    for(const t of axis.ticks??[]){const tick=el('span','tk-compare-tick',String(t));tick.style.left=`${spanBox({start:t,end:t},axis).left}%`;box.append(tick)}
    for(const span of spans){
      const bar=el('span','tk-compare-span')
      if(span.kind)bar.dataset.kind=span.kind
      if(span.label){bar.title=span.label;bar.setAttribute('aria-label',span.label)}
      place(bar,span,axis)
      box.append(bar)
    }
    return box
  }
  const place=(node,span,axis)=>{const {left,width}=spanBox(span,axis);node.style.left=`${left}%`;node.style.width=`${width}%`}
  render(items)
  return {update:render,destroy:()=>host.remove()}
}
