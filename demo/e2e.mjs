// Browser proof of the hook and components on the built demo (npm run build first).
// CHROMIUM=/path/to/chromium overrides the browser; PORT the preview port.
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'

const port = process.env.PORT ?? '4733'
const server = spawn('npx', ['vite', 'preview', '--port', port, '--strictPort'], { stdio: 'ignore' })
let failed = 0
const ok = (cond, m) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${m}`); if (!cond) failed++ }
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/usr/lib/chromium/chromium' })
try {
  const p = await b.newPage({ viewport: { width: 640, height: 520 } })
  for (let i = 0; i < 50; i++) { try { await p.goto(`http://localhost:${port}/`); break } catch { await p.waitForTimeout(200) } }
  const rows = p.locator('[data-testid=row]')
  const list = p.locator('[data-testid=list]')
  const sel = () => p.$$eval('[data-testid=row][aria-selected=true]', (els) => els.map((e) => e.id))
  const cur = () => list.getAttribute('aria-activedescendant')
  const focused = () => p.evaluate(() => document.activeElement?.getAttribute('data-testid'))
  const settle = () => p.waitForFunction(() => !/…$/.test(document.querySelector('[role=status]')?.textContent ?? ''))

  ok(await list.getAttribute('role') === 'listbox' && await list.getAttribute('aria-multiselectable') === 'true', 'listbox with aria-multiselectable')
  ok(await cur() === 'triage-r1' && (await sel()).join() === 'triage-r1', 'first row is the cursor and selected')

  await rows.nth(1).click()
  ok(await cur() === 'triage-r2' && await focused() === 'list', 'click selects and focuses the list')
  await p.keyboard.press('Shift+ArrowDown'); await p.keyboard.press('Shift+ArrowDown')
  ok((await sel()).join() === 'triage-r2,triage-r3,triage-r4', '⇧↓ extends from the anchor')
  ok(/3 selected/.test(await p.textContent('[data-testid=footer]')), 'footer counts the selection')

  // A held commit: the cursor moves before the server answers.
  await p.evaluate(() => { window.__gate = new Promise((r) => { window.__release = r }) })
  await p.keyboard.press('1')
  await p.keyboard.press('1')
  ok(await cur() === 'triage-r5', 'cursor moves to the next untouched row while the request is pending')
  ok(/…/.test(await p.textContent('[role=status]')), 'pending toast at once')
  await p.evaluate(() => { window.__release(); window.__gate = undefined }); await settle()
  ok(await p.evaluate(() => window.__commits) === 1, 'a second press while pending sends nothing')
  ok(await rows.count() === 37, 'decided rows leave the open list')
  ok(await focused() === 'list', 'focus is back on the list')

  const before = await cur()
  await p.keyboard.press('u'); await settle()
  ok(await rows.count() === 40, 'U brings the batch back')
  ok(await cur() === before, 'undo keeps the cursor where it is')

  // A failed batch restores the selection.
  await rows.nth(9).click(); await p.keyboard.press('Shift+ArrowDown')
  const was = await sel()
  await p.evaluate(() => { window.__failNext = true })
  await p.keyboard.press('3'); await settle()
  ok((await sel()).join() === was.join() && await rows.count() === 40, 'failure restores the selection and changes nothing')
  ok(/Could not save/.test(await p.textContent('[role=status]')), 'failure is shown')

  // Enter approves suggestions; a row without one is skipped, not guessed.
  await rows.nth(3).click(); await p.keyboard.press('Shift+ArrowDown')  // r4 (keep) and r5 (none)
  await p.keyboard.press('Enter'); await settle()
  const approved = await p.textContent('[role=status]')
  ok(/Approved 1 \(1 skipped\)/.test(approved), `Enter approves the suggestion and skips the row without one (${approved})`)

  // Keys on a focused button are the button's.
  const n = await p.evaluate(() => window.__commits)
  await p.locator('[data-testid=action-keep]').focus(); await p.keyboard.press('2')
  ok(await p.evaluate(() => window.__commits) === n, 'a digit on a focused button is not a list action')
  await p.locator('[data-testid=only-open]').focus(); await p.keyboard.press('Meta+a')
  ok((await sel()).length < 5, '⌘A on a form control does not select rows')

  await list.focus(); await p.keyboard.press('Meta+a')
  ok((await sel()).length === await rows.count(), '⌘A selects every visible row')

  const scroll = await p.evaluate(() => { const l = document.querySelector('[data-slot=triage-scroll]'); return { page: document.documentElement.scrollHeight - innerHeight, list: l.scrollHeight - l.clientHeight } })
  ok(scroll.page <= 0 && scroll.list > 0, `only the list scrolls (${JSON.stringify(scroll)})`)
  ok(await p.locator('[data-testid=inspector]').isVisible(), 'inspector beside the list at 640 px')
  ok(await p.locator('[data-testid=inspector] [aria-keyshortcuts="1"][title="Keep (1)"]').count() === 1, 'action buttons carry aria-keyshortcuts and a title with the key')
  await p.screenshot({ path: process.env.SHOT ?? '/tmp/triage-kit-demo.png' })
  await p.setViewportSize({ width: 420, height: 520 })
  ok(!(await p.locator('[data-testid=inspector]').isVisible()), 'below 520 px the inspector hides')
  const narrow = await p.evaluate(() => { const l = document.querySelector('[data-slot=triage-scroll]'); return { page: document.documentElement.scrollHeight - innerHeight, list: l.scrollHeight - l.clientHeight } })
  ok(narrow.page <= 0 && narrow.list > 0, `below 520 px only the list scrolls too (${JSON.stringify(narrow)})`)
  await rows.first().click()
  const count = await rows.count()
  await p.locator('[data-testid=narrow-actions] button', { hasText: 'Keep' }).click(); await settle()
  ok(await rows.count() === count - 1, 'below 520 px the actions are still on screen and work')
} finally {
  await b.close(); server.kill()
}
process.exit(failed ? 1 : 0)
