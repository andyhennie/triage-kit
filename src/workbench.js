import {createElement as h, useId} from 'react'

/** Controlled list/inspector shell over the list.css markup. Data, selection, keys and
 * persistence belong to the app. */
export function TriageWorkbench({title, navigation, toolbar, head, rows, selection, current, onSelect,
  onKeyDown, listRef, inspectorRef, inspector, actions, status, busy=false,
  labels={list:'Items', inspector:'Inspect', empty:'No items', selected:(n,total)=>`${n} selected · ${total}`}}) {
  const prefix=useId()
  const rowId=id=>`${prefix}-row-${encodeURIComponent(String(id))}`
  const focusList=()=>listRef?.current?.focus({preventScroll:true})
  return h('main',{className:'triage-kit-workbench',onKeyDown,'aria-busy':busy},
    h('header',{className:'tk-header'},h('strong',null,title),navigation),
    h('div',{className:'tk-workspace'},
      h('section',{className:'tk-inbox'},
        h('div',{className:'tk-toolbar'},toolbar),
        head?h('div',{className:'tk-head','aria-hidden':true},...head.map((cell,i)=>h('span',{key:i,className:i===2?'tk-num':undefined},cell))):null,
        h('div',{className:'tk-list',ref:listRef,role:'listbox',tabIndex:0,
          'aria-label':labels.list,'aria-multiselectable':true,
          'aria-activedescendant':rows.some(row=>row.id===current)?rowId(current):undefined},
          rows.length?rows.map(row=>h('div',{key:row.id,id:rowId(row.id),role:'option',
            className:'tk-row','aria-selected':selection.has(row.id),'data-current':row.id===current?'':undefined,
            onMouseDown:event=>{
              // Ctrl/⌘-click belongs to the context menu or the browser; controls keep their clicks.
              if(event.ctrlKey||event.metaKey||event.button!==0||event.target.closest('button,a,input,select,textarea,summary,[data-triage-ignore]'))return
              onSelect(row.id,event.shiftKey);focusList()
            }},
            h('span',{className:'tk-cell tk-leading'},row.leading),
            h('span',{className:'tk-cell tk-title'},row.title),
            h('span',{className:'tk-cell tk-num tk-trailing'},row.trailing))):h('p',{className:'tk-empty'},labels.empty)),
        h('footer',{className:'tk-footer'},h('span',null,labels.selected(selection.size,rows.length)),
          h('div',{className:'tk-actions'},actions))),
      h('aside',{className:'tk-inspector','aria-label':labels.inspector,tabIndex:-1,ref:inspectorRef},inspector)),
    h('div',{className:'tk-status',role:'status','aria-live':'polite','aria-atomic':true},status))
}
