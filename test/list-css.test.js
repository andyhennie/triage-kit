import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const css=readFileSync(new URL('../src/list.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'')

test('list.css declares the documented variables with their defaults',()=>{
  for(const [name,value] of Object.entries({
    '--tk-row-height':'28px','--tk-row-pad-x':'12px','--tk-gap':'12px','--tk-font-size':'13px',
    '--tk-columns':'minmax(0, 20%) minmax(0, 1fr) fit-content(30%)','--tk-accent':'#2563eb',
  }))assert.match(css,new RegExp(`${name}:\\s*${value.replace(/[()%]/g,'\\$&')};`),name)
  for(const name of ['--tk-canvas','--tk-text','--tk-muted','--tk-border','--tk-selection','--tk-hover'])
    assert.match(css,new RegExp(`${name}:`),name)
})

test('every list.css rule has zero specificity, so app CSS always wins',()=>{
  const selectors=[...css.matchAll(/([^{}]+)\{/g)].map(m=>m[1].trim()).filter(s=>!s.startsWith('@'))
  assert.ok(selectors.length>5)
  for(const s of selectors)assert.match(s,/^:where\([^]*\)$/,s)
})

test('touch rows keep a 44 px target even under a smaller app height',()=>{
  assert.match(css,/@media \(pointer: coarse\), \(max-width: 700px\)[^}]*min-height: max\(44px, var\(--tk-row-height\)\)/)
})
