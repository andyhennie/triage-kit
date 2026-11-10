// A list of questions (or assumptions, findings: lines of text that each need an answer)
// on the core functions, without React. The whole text and the answer buttons are in the
// row itself; there is no inspector. Queues are tabs, a key answers every selected row as
// one batch, answered rows leave the "to decide" queue so the cursor moves on, and U
// undoes. Everything an app changes is in the config (see questions.d.ts); state lives in
// storage.
import {reconcile,selectOne,selectRange,applyListKey,afterAction,routeKey,batchFor,undoOf,HISTORY_LIMIT} from './index.js'

function h(tag,props={},...kids){
  const node=document.createElement(tag)
  for(const [key,value] of Object.entries(props)){
    if(value==null||value===false)continue
    if(key==='class')node.className=value
    else if(key==='text')node.textContent=value
    else if(key.startsWith('on'))node.addEventListener(key.slice(2),value)
    else node.setAttribute(key,value===true?'':value)
  }
  node.append(...kids.flat().filter(kid=>kid!=null&&kid!==false))
  return node
}

let mounts=0
const noSelection={selection:new Set(),current:null,selectionAnchor:null}

export function mountQuestions(root,config){
  const {title,items,decisions,storageKey,comment=false,actions=[],help,onChange}=config
  const columns=config.columns??['','Question','Group','Status','Answer']
  const L={open:'To decide',all:'All',list:'Questions',empty:'Nothing here',comment:'Comment',
    undo:'Undo',undone:'Undone',nothingToUndo:'Nothing to undo',unchanged:'No change',
    selected:(n,total)=>`${n} selected · ${total}`,...config.labels}
  let storage=config.storage
  if(storage===undefined)try{storage=globalThis.localStorage}catch{storage=null}
  const prefix=`questions-${++mounts}`,rowId=id=>`${prefix}-row-${encodeURIComponent(String(id))}`
  const byId=new Map(items.map(item=>[item.id,item])),decisionOf=new Map(decisions.map(d=>[d.id,d]))

  // data: decisions and comments by item id, and the batches U can still undo.
  let data={d:{},c:{},h:[]}
  try{data={...data,...JSON.parse(storage?.getItem(storageKey))}}catch{}
  const save=()=>{try{storage?.setItem(storageKey,JSON.stringify(data))}catch{}}

  const queues=[{id:'open',label:L.open,has:item=>!data.d[item.id]},
    ...decisions.map(d=>({id:d.id,label:d.label,tone:d.tone,has:item=>data.d[item.id]===d.id})),
    {id:'all',label:L.all,has:()=>true}]
  // editing: the row whose comment is open. It stays in the list until the comment is left,
  // even when its answer has moved it out of this queue.
  // option: the answer button ← → has moved to on the cursor row, as {id, index}; Enter applies it.
  let queue='open',status='',editing=null,option=null
  const ids=()=>{const has=queues.find(q=>q.id===queue).has;return items.filter(item=>has(item)||item.id===editing).map(item=>item.id)}
  let sel=reconcile(noSelection,ids())

  // ← → walk the answer buttons of the cursor row and Space applies; an app cannot rebind them.
  const keys={}
  for(const d of decisions)for(const key of d.keys??[])keys[key]=`decide:${d.id}`
  Object.assign(keys,{ArrowLeft:'option:-1',ArrowRight:'option:1',' ':'apply'})

  const tabs=h('nav',{'aria-label':'Queues'}),toolbar=h('div',{class:'tk-toolbar'})
  const list=h('div',{class:'tk-list',role:'listbox',tabindex:'0','aria-label':L.list,'aria-multiselectable':'true'})
  const count=h('span'),statusLine=h('div',{class:'tk-status',role:'status','aria-live':'polite','aria-atomic':'true'})
  const undoButton=h('button',{type:'button',title:'U','aria-keyshortcuts':'u',onclick:()=>{undo();render();list.focus()}},L.undo,h('kbd',{text:'U'}))
  const page=h('main',{class:'triage-kit-workbench questions'},
    h('header',{class:'tk-header'},h('strong',{text:title}),tabs),
    toolbar,
    h('div',{class:'tk-head','aria-hidden':'true'},columns.map(text=>h('span',{text}))),
    list,
    h('footer',{class:'tk-footer'},count,h('div',{class:'tk-actions'},undoButton)),
    statusLine)
  if(help)toolbar.append(h('details',{class:'qs-help'},h('summary',{text:help.summary}),help.lines.map(text=>h('p',{text}))))
  toolbar.append(h('div',{class:'tk-actions'},actions.map(action=>h('button',{type:'button',text:action.label,onclick:()=>action.run(api)}))))

  // Close the open comment; a row that no longer belongs to this queue leaves and hands the cursor on.
  function stopEditing(){
    if(editing==null)return
    const before=ids(),id=editing
    editing=null
    if(!ids().includes(id))sel=afterAction({ids:before,...sel,affected:new Set([id]),left:[id]})
  }
  function setQueue(id){editing=null;queue=id;sel=reconcile(noSelection,ids())}

  // One press is one batch for the selection; rows that leave this queue hand the cursor on.
  function decide(id){
    const before=ids(),rows=items.map(item=>({id:item.id,decision:data.d[item.id]}))
    const batch=batchFor(rows,sel.selection,id)
    if(!batch.items.length||batch.tooMany){status=L.unchanged;return}
    for(const item of batch.items)data.d[item.id]=item.decision
    data.h=[...data.h,{items:batch.items}].slice(-HISTORY_LIMIT)
    // An answer that asks for a comment keeps its one row in place with the comment open.
    editing=comment&&decisionOf.get(id).comment&&batch.items.length===1?batch.items[0].id:null
    const shown=new Set(ids())
    sel=afterAction({ids:before,...sel,affected:new Set(batch.items.map(item=>item.id)),left:before.filter(row=>!shown.has(row))})
    status=`${decisionOf.get(id).label} · ${batch.items.length}`
    changed()
  }
  function undo(){
    const batch=data.h.at(-1)
    if(!batch){status=L.nothingToUndo;return}
    for(const item of undoOf(batch))item.decision==null?delete data.d[item.id]:data.d[item.id]=item.decision
    data.h=data.h.slice(0,-1)
    editing=null
    sel=reconcile(sel,ids())
    status=`${L.undone} · ${batch.items.length}`
    changed()
  }
  function changed(){save();onChange?.(api)}
  const marked=()=>option&&option.id===sel.current?decisions[option.index]:null
  // Start from the row's own answer when it has one, else from the near end.
  function stepOption(delta){
    if(sel.current==null)return
    const at=marked()?option.index:decisions.findIndex(d=>d.id===data.d[sel.current])
    const index=at<0?(delta>0?0:decisions.length-1):Math.max(0,Math.min(decisions.length-1,at+delta))
    option={id:sel.current,index}
  }
  const focusAfter=()=>(editing==null?list:list.querySelector('.qs-comment')??list).focus()

  function row(id){
    const item=byId.get(id),note=data.c[id]
    // The buttons repeat the keys for the pointer; they stay out of the tab order so the
    // listbox keeps one tab stop.
    const buttons=h('span',{class:'qs-decisions'},decisions.map(d=>h('button',{type:'button',tabindex:'-1',title:d.long??d.label,
      'data-tone':d.tone,'aria-pressed':String(data.d[id]===d.id),'data-marked':id===sel.current&&marked()===d,
      onclick:()=>{stopEditing();if(!sel.selection.has(id))sel=selectOne(sel,id);decide(d.id);render();focusAfter()}},
      d.label,d.kbd&&h('kbd',{text:d.kbd}))))
    const field=comment&&editing===id?h('textarea',{class:'qs-comment',rows:'2',placeholder:L.comment,'aria-label':L.comment,
      oninput:e=>{e.target.value?data.c[id]=e.target.value:delete data.c[id];changed()},
      onkeydown:e=>{if(e.key==='Escape'){e.preventDefault();stopEditing();render();list.focus()}}}):null
    if(field)field.value=note??''
    return h('div',{id:rowId(id),class:'tk-row',role:'option','data-id':String(id),'aria-selected':String(sel.selection.has(id)),'data-current':id===sel.current},
      h('span',{class:'tk-muted qs-leading',text:item.leading??''}),
      h('span',{class:'qs-title'},h('span',{text:item.title}),field,!field&&note?h('span',{class:'qs-note tk-muted',text:note}):null),
      h('span',{class:'tk-cell tk-muted qs-group',text:item.group??''}),
      h('span',{class:'tk-cell qs-tag','data-tone':item.tone,text:item.tag??''}),
      buttons)
  }
  function render(){
    tabs.replaceChildren(...queues.map(q=>h('button',{type:'button','aria-pressed':String(q.id===queue),'data-tone':q.tone,
      onclick:()=>{setQueue(q.id);render();list.focus()}},q.label,h('span',{class:'qs-count',text:String(items.filter(q.has).length)}))))
    const shown=ids()
    list.replaceChildren(...(shown.length?shown.map(row):[h('p',{class:'tk-empty tk-muted',text:L.empty})]))
    sel.current==null?list.removeAttribute('aria-activedescendant'):list.setAttribute('aria-activedescendant',rowId(sel.current))
    document.getElementById(rowId(sel.current))?.scrollIntoView?.({block:'nearest'})
    // Every row is its own grid: give the answer column one measured width so rows and header line up.
    const width=list.querySelector('.qs-decisions')?.getBoundingClientRect?.().width
    if(width)page.style.setProperty('--qs-decisions-width',`${Math.ceil(width)}px`)
    count.textContent=L.selected(sel.selection.size,shown.length)
    undoButton.disabled=!data.h.length
    statusLine.textContent=status
  }

  page.addEventListener('keydown',e=>{
    const route=routeKey(e,{queues:true,keys,open:false,enter:'comment'})
    if(!route)return
    e.preventDefault()
    if(e.repeat&&!route.repeat)return
    stopEditing()
    if(route.action==='list')sel=applyListKey(sel,ids(),route.arg)
    else if(route.action==='queue'){const at=queues.findIndex(q=>q.id===queue);setQueue(queues[Math.max(0,Math.min(queues.length-1,at+route.arg))].id)}
    else if(route.action==='undo')undo()
    else if(route.action.startsWith('option:'))stepOption(Number(route.action.slice(7)))
    else if(route.action==='apply'||(route.action==='comment'&&marked())){const d=marked();if(d)decide(d.id)}
    else if(route.action==='comment'){if(comment&&sel.current!=null){sel=selectOne(sel,sel.current);editing=sel.current}}
    else decide(route.action.slice('decide:'.length))
    if(!marked())option=null
    render()
    focusAfter()
  })
  list.addEventListener('mousedown',e=>{
    const target=e.target.closest?.('.tk-row')
    // Ctrl/⌘-click belongs to the context menu or the browser; buttons and the comment handle themselves.
    if(!target||e.button!==0||e.ctrlKey||e.metaKey||e.target.closest('button,textarea'))return
    const id=items.find(item=>String(item.id)===target.dataset.id).id
    stopEditing()
    if(!ids().includes(id)){render();return}
    sel=e.shiftKey?selectRange(sel,ids(),id)??selectOne(sel,id):selectOne(sel,id)
    render()
  })

  const api={
    get decisions(){return {...data.d}},
    get comments(){return {...data.c}},
    rows:()=>items.map(item=>({...item,decision:data.d[item.id]??null,comment:data.c[item.id]??''})),
    toast(text){status=text;statusLine.textContent=text},
    reset(){data={d:{},c:{},h:[]};setQueue('open');status='';changed();render()},
  }
  root.replaceChildren(page)
  render()
  list.focus()
  return api
}
