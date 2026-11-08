import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const css=readFileSync(new URL('../src/list.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'')
const esc=s=>s.replace(/[()%.]/g,'\\$&')

test('every variable has its documented fallback, reading app tokens first',()=>{
  for(const [name,value] of Object.entries({
    '--tk-row-height':'28px','--tk-row-pad-x':'20px','--tk-gap':'16px','--tk-font-size':'13px','--tk-head-font-size':'11px',
    '--tk-columns':'minmax(0, 20%) minmax(0, 1fr) fit-content(30%)',
    '--tk-canvas':'var(--background, #fff)','--tk-text':'var(--foreground, #18181b)',
    '--tk-muted':'var(--muted-foreground, #71717a)','--tk-border':'var(--accent, #f4f4f5)',
    '--tk-hover':'var(--accent, #f4f4f5)','--tk-selection':'var(--selection, #e8eefd)',
    '--tk-accent':'var(--selection-edge, #1147bb)',
  }))assert.match(css,new RegExp(`var\\(${name}, ${esc(value)}\\)`),name)
  // No defaults declared on elements: values set on any ancestor must reach the rows.
  assert.doesNotMatch(css,/^\s*--tk-[\w-]+\s*:/m)
})

test('every list.css rule has zero specificity, so app CSS always wins',()=>{
  const selectors=[...css.matchAll(/([^{}]+)\{/g)].map(m=>m[1].trim()).filter(s=>!s.startsWith('@'))
  assert.ok(selectors.length>5)
  for(const s of selectors)assert.match(s,/^:where\([^]*\)$/,s)
})

test('touch rows keep a 44 px target even under a smaller app height',()=>{
  assert.match(css,/@media \(pointer: coarse\), \(max-width: 700px\)[^}]*min-height: max\(44px, var\(--tk-row-height, 28px\)\)/)
})
