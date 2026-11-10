// A decision list for lines of text (questions, assumptions, findings) on the core
// functions, without React: queues as tabs, one key per decision, a batch per key press,
// U to undo, and an inspector with the full text of the row under the cursor. Rows that
// get a decision leave the "to decide" queue, so the cursor moves on by itself.
// Everything an app changes is in the config (see decide.d.ts); state lives in storage.
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

export function mountDecide(root,config){
  const {title,items,decisions,storageKey,comment=false,actions=[],help,onChange}=config
  const columns=config.columns??['','Item','Group','Status','Decision']
  const L={open:'To decide',all:'All',list:'Items',inspector:'Inspect',empty:'Nothing here',comment:'Comment',
    undo:'Undo',undone:'Undone',nothingToUndo:'Nothing to undo',unchanged:'No change',
    selected:(n,total)=>`${n} selected · ${total}`,many:n=>`${n} items selected`,...config.labels}
  let storage=config.storage
  if(storage===undefined)try{storage=globalThis.localStorage}catch{storage=null}
  const prefix=`decide-${++mounts}`,rowId=id=>`${prefix}-row-${encodeURIComponent(String(id))}`
  const byId=new Map(items.map(item=>[item.id,item])),decisionOf=new Map(decisions.map(d=>[d.id,d]))

  // data: decisions and comments by item id, and the batches U can still undo.
  let data={d:{},c:{},h:[]}
  try{data={...data,...JSON.parse(storage?.getItem(storageKey))}}catch{}
  const save=()=>{try{storage?.setItem(storageKey,JSON.stringify(data))}catch{}}

  const queues=[{id:'open',label:L.open,has:item=>!data.d[item.id]},
    ...decisions.map(d=>({id:d.id,label:d.label,tone:d.tone,has:item=>data.d[item.id]===d.id})),
    {id:'all',label:L.all,has:()=>true}]
  // pinned: a row whose decision asks for a comment stays in the inspector after it left the queue.
  let queue='open',status='',pinned=null
  const ids=()=>items.filter(queues.find(q=>q.id===queue).has).map(item=>item.id)
  let sel=reconcile({selection:new Set(),current:null,selectionAnchor:null},ids())

  const keys={}
  for(const d of decisions)for(const key of d.keys??[])keys[key]=`decide:${d.id}`

  const tabs=h('nav',{'aria-label':'Queues'}),toolbar=h('div',{class:'tk-toolbar'})
  const list=h('div',{class:'tk-list',role:'listbox',tabindex:'0','aria-label':L.list,'aria-multiselectable':'true'})
  const count=h('span'),inspector=h('aside',{class:'tk-inspector','aria-label':L.inspector,tabindex:'-1'})
  const statusLine=h('div',{class:'tk-status',role:'status','aria-live':'polite','aria-atomic':'true'})
  const undoButton=h('button',{type:'button',title:'U','aria-keyshortcuts':'u',onclick:()=>{undo();render();list.focus()}},L.undo,h('kbd',{text:'U'}))
  const page=h('main',{class:'triage-kit-workbench decide'},
    h('header',{class:'tk-header'},h('strong',{text:title}),tabs),
    h('div',{class:'tk-workspace'},
      h('section',{class:'tk-inbox'},toolbar,
        h('div',{class:'tk-head','aria-hidden':'true'},columns.map(text=>h('span',{text}))),
        list,
        h('footer',{class:'tk-footer'},count,h('div',{class:'tk-actions'},undoButton))),
      inspector),
    statusLine)
  for(const action of actions)toolbar.append(h('button',{type:'button',text:action.label,onclick:()=>action.run(api)}))

  function setQueue(id){pinned=null;queue=id;sel=reconcile({selection:new Set(),current:null,selectionAnchor:null},ids())}

  // One press is one batch for the selection; rows that leave this queue hand the cursor on.
  function decide(id){
    const before=ids(),rows=items.map(item=>({id:item.id,decision:data.d[item.id]}))
    const batch=batchFor(rows,pinned==null?sel.selection:new Set([pinned]),id)
    if(!batch.items.length||batch.tooMany){status=L.unchanged;return}
    for(const item of batch.items)data.d[item.id]=item.decision
    data.h=[...data.h,{items:batch.items}].slice(-HISTORY_LIMIT)
    const shown=new Set(ids())
    sel=pinned==null?afterAction({ids:before,...sel,affected:new Set(batch.items.map(item=>item.id)),left:before.filter(row=>!shown.has(row))}):reconcile(sel,ids())
    pinned=comment&&decisionOf.get(id).comment&&batch.items.length===1?batch.items[0].id:null
    status=`${decisionOf.get(id).label} · ${batch.items.length}`
    changed()
  }
  function undo(){
    const batch=data.h.at(-1)
    if(!batch){status=L.nothingToUndo;return}
    for(const item of undoOf(batch))item.decision==null?delete data.d[item.id]:data.d[item.id]=item.decision
    data.h=data.h.slice(0,-1)
    pinned=null
    sel=reconcile(sel,ids())
    status=`${L.undone} · ${batch.items.length}`
    changed()
  }
  function changed(){save();onChange?.(api)}

  function renderInspector(){
    const chosen=pinned==null?[...sel.selection]:[pinned],item=chosen.length===1?byId.get(chosen[0]):null
    const common=chosen.length&&chosen.every(id=>data.d[id]===data.d[chosen[0]])?data.d[chosen[0]]:null
    const buttons=h('div',{class:'dc-decisions'},decisions.map(d=>h('button',{type:'button',title:d.long??d.label,
      'data-tone':d.tone,'aria-pressed':String(common===d.id),'aria-keyshortcuts':(d.keys??[]).join(' '),
      disabled:!chosen.length,onclick:()=>{decide(d.id);render();focusAfter()}},d.label,d.kbd&&h('kbd',{text:d.kbd}))))
    const note=comment&&item?h('textarea',{class:'dc-comment',rows:'3',placeholder:L.comment,'aria-label':L.comment,
      oninput:e=>{e.target.value?data.c[item.id]=e.target.value:delete data.c[item.id];changed()},
      onkeydown:e=>{if(e.key==='Escape'){e.preventDefault();pinned=null;render();list.focus()}}}):null
    if(note)note.value=data.c[item.id]??''
    inspector.replaceChildren(...[
      item?h('h1',{text:item.title}):chosen.length?h('h1',{text:L.many(chosen.length)}):h('p',{class:'tk-muted',text:L.empty}),
      item&&(item.group||item.tag)?h('p',{class:'tk-muted',text:[item.group,item.tag].filter(Boolean).join(' · ')}):null,
      buttons,note,
      help?h('details',{class:'dc-help'},h('summary',{text:help.summary}),help.lines.map(text=>h('p',{text}))):null,
    ].filter(Boolean))
  }
  function render(){
    tabs.replaceChildren(...queues.map(q=>h('button',{type:'button','aria-pressed':String(q.id===queue),'data-tone':q.tone,
      onclick:()=>{setQueue(q.id);render();list.focus()}},q.label,h('span',{class:'dc-count',text:String(items.filter(q.has).length)}))))
    const shown=ids()
    list.replaceChildren(...(shown.length?shown.map(id=>{
      const item=byId.get(id),d=decisionOf.get(data.d[id])
      return h('div',{id:rowId(id),class:'tk-row',role:'option','data-id':String(id),'aria-selected':String(sel.selection.has(id)),'data-current':id===sel.current},
        h('span',{class:'tk-cell tk-muted',text:item.leading??''}),
        h('span',{class:'tk-cell dc-title',text:item.title}),
        h('span',{class:'tk-cell tk-muted',text:item.group??''}),
        h('span',{class:'tk-cell dc-tag','data-tone':item.tone,text:item.tag??''}),
        h('span',{class:'tk-cell dc-decision','data-tone':d?.tone,text:d?.label??''}))
    }):[h('p',{class:'tk-empty tk-muted',text:L.empty})]))
    sel.current==null?list.removeAttribute('aria-activedescendant'):list.setAttribute('aria-activedescendant',rowId(sel.current))
    document.getElementById(rowId(sel.current))?.scrollIntoView?.({block:'nearest'})
    count.textContent=L.selected(sel.selection.size,shown.length)
    undoButton.disabled=!data.h.length
    statusLine.textContent=status
    renderInspector()
  }

  const focusAfter=()=>(pinned==null?list:inspector.querySelector('.dc-comment')??list).focus()
  page.addEventListener('keydown',e=>{
    const route=routeKey(e,{queues:true,keys,open:false,enter:comment?'comment':null})
    if(!route)return
    e.preventDefault()
    if(e.repeat&&!route.repeat)return
    pinned=null
    if(route.action==='list')sel=applyListKey(sel,ids(),route.arg)
    else if(route.action==='queue'){const at=queues.findIndex(q=>q.id===queue);setQueue(queues[Math.max(0,Math.min(queues.length-1,at+route.arg))].id)}
    else if(route.action==='undo')undo()
    else if(route.action==='comment'){inspector.querySelector('.dc-comment')?.focus();return}
    else decide(route.action.slice('decide:'.length))
    render()
    focusAfter()
  })
  list.addEventListener('mousedown',e=>{
    const row=e.target.closest?.('.tk-row')
    // Ctrl/⌘-click belongs to the context menu or the browser, not the selection.
    if(!row||e.button!==0||e.ctrlKey||e.metaKey)return
    pinned=null
    const id=items.find(item=>String(item.id)===row.dataset.id).id
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
