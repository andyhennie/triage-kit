// Renders TriageWorkbench to examples/workbench.html (static; gitignored) so its look can be
// checked in a browser: node examples/workbench.mjs, then serve the repo root.
import {writeFileSync} from 'node:fs'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {TriageWorkbench} from '../src/workbench.js'

const rows=Array.from({length:20},(_,i)=>({id:`p${i+1}`,leading:`${28-i}. sep.`,
  title:i%4?`Purchase ${i+1}`:`Example Supplier Ltd · a long purchase description that has to be truncated ${i+1}`,
  trailing:`${((i+1)*321.5).toLocaleString('nb-NO',{minimumFractionDigits:2})}`}))
const html=renderToStaticMarkup(h(TriageWorkbench,{
  title:'Purchases',head:['Date','Purchase','Amount'],rows,selection:new Set(['p1','p2']),current:'p2',onSelect(){},
  navigation:h('nav',null,h('button',null,'Inbox'),h('button',null,'Done')),
  toolbar:h('input',{placeholder:'Search'}),
  inspector:h('div',null,h('h1',null,'Purchase 2'),h('p',null,'App-owned inspector content.')),
  actions:h('button',null,'Approve',h('kbd',null,'↵')),status:'Ready',
}))
writeFileSync(new URL('./workbench.html',import.meta.url),`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>triage-kit · workbench</title>
<link rel="stylesheet" href="../src/workbench.css">
<style>body{margin:0}.triage-kit-workbench{--tk-columns:84px minmax(0,1fr) 110px}</style></head><body>${html}</body></html>`)
console.log('wrote examples/workbench.html')
