import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {TriageWorkbench} from '../src/workbench.js'

test('controlled workbench renders the list.css contract, app slots and escaped text',()=>{
  const html=renderToStaticMarkup(h(TriageWorkbench,{
    title:'Review',head:['Source','Title','Amount'],
    rows:[{id:'a b',title:'<script>bad</script>',leading:'Source',trailing:'100'},{id:'second',title:'Next'}],
    selection:new Set(['a b','second']),current:'a b',
    onSelect:()=>{},inspector:h('p',null,'Details'),actions:h('button',null,'Keep'),status:'Ready'
  }))
  assert.match(html,/class="tk-list" role="listbox"/)
  assert.match(html,/aria-multiselectable="true"/)
  assert.match(html,/aria-activedescendant="[^"]+a%20b"/)
  assert.equal((html.match(/class="tk-row"/g)||[]).length,2)
  assert.equal((html.match(/class="tk-cell /g)||[]).length,6)
  assert.match(html,/class="tk-head" aria-hidden="true"><span>Source<\/span><span>Title<\/span><span class="tk-num">Amount<\/span>/)
  assert.equal((html.match(/aria-selected="true"/g)||[]).length,2)
  assert.match(html,/&lt;script&gt;bad&lt;\/script&gt;/)
  assert.doesNotMatch(html,/<small>/)
  assert.match(html,/2 selected · 2/)
  assert.match(html,/role="status"/)
  assert.match(html,/Details/)
  assert.match(html,/>Keep</)
})

test('empty workbench has no dangling active descendant and no header unless asked',()=>{
  const html=renderToStaticMarkup(h(TriageWorkbench,{title:'Review',rows:[],selection:new Set(),current:'missing',onSelect:()=>{}}))
  assert.doesNotMatch(html,/aria-activedescendant/)
  assert.doesNotMatch(html,/class="tk-head"/)
  assert.match(html,/No items/)
})
