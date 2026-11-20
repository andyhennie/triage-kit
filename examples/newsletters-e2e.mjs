// Browser check of examples/newsletters.html against a fake mail backend: proposals, Enter,
// overrides, the pending window and U, per-sender unsubscribe confirmation, reply never
// sending, and the CSRF handshake in the proxy. No real mailbox is touched.
//   PLAYWRIGHT=…/playwright-core/index.mjs CHROMIUM=… node examples/newsletters-e2e.mjs
import {createServer} from 'node:http'
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'
const {chromium} = await import(process.env.PLAYWRIGHT ?? 'playwright-core')

const item = (id, sender, queues, extra = {}) => ({id, sender, title: `Subject ${id}`, version: 1, received_at: `2026-11-${10 + id}T08:00:00Z`,
  gmail_url: `https://mail.google.com/#all/${id}`, jev: {queues, needs_context: []}, automatic_queue: null, planned_actions: [], jev_input_ready: true, ...extra})
const state = {source: {id: 5}, items: [
  item(1, 'Shop <a@shop.example>', ['jev_offers']), item(2, 'Shop <a@shop.example>', ['jev_offers']),
  item(3, 'News <n@news.example>', ['jev_newsletters']),
  item(4, 'Spam <s@spam.example>', ['jev_offers', 'jev_unsubscribe']),            // open: asks Jev
  item(5, 'Friend <f@friend.example>', ['jev_personal', 'jev_newsletters']),      // a newsletter Jev says to answer
  item(6, 'Club <c@club.example>', ['jev_personal', 'jev_unsubscribe']),
  item(7, 'Bank <b@bank.example>', ['jev_offers'], {automatic_queue: 'security_alerts'}), // a rule queue wins
]}
const posts = []
const fake = createServer(async (req, res) => {
  let body = ''
  for await (const c of req) body += c
  const json = (code, data) => { res.writeHead(code, {'content-type': 'application/json'}); res.end(JSON.stringify(data)) }
  if (req.url === '/') { res.writeHead(200, {'content-type': 'text/html', 'set-cookie': 'sess=abc; path=/'}); return res.end('<meta name="csrf-token" content="tok123">') }
  if (req.method === 'POST' && (req.headers['x-csrf-token'] !== 'tok123' || req.headers.cookie !== 'sess=abc')) return json(422, {error: 'InvalidAuthenticityToken'})
  if (req.url.startsWith('/api/state')) return json(200, state)
  if (req.url.startsWith('/api/background_tasks') && req.method === 'GET') return json(200, {tasks: []})
  if (req.url.startsWith('/api/items/4/jev_decision')) {
    if (req.method === 'GET') return json(200, {decision: null})
    posts.push({path: 'jev_decision'}); return json(200, {decision: {choice: 'unsubscribe', confidence: 0.7}})
  }
  if (/^\/api\/items\/\d+\/preview/.test(req.url)) return json(200, {messages: [{body_html: `<p id="body">Body of ${req.url.split('/')[3]}</p>`}]})
  if (req.url.startsWith('/api/items/6/jev_decision')) return req.method === 'GET' ? json(200, {decision: null}) : json(503, {error: 'Privacy check needs review; nothing sent to Jev'})
  if (req.method === 'POST') { posts.push({path: req.url.split('?')[0], ...JSON.parse(body)}); return json(202, {id: posts.length}) }
  json(404, {})
}).listen(4391, '127.0.0.1')

const server = spawn(process.execPath, [new URL('newsletters-server.mjs', import.meta.url).pathname], {env: {...process.env, PORT: '4390', MAIL_API: 'http://127.0.0.1:4391'}, stdio: 'ignore'})
await new Promise(r => setTimeout(r, 400))
const browser = await chromium.launch({executablePath: process.env.CHROMIUM ?? '/usr/lib/chromium/chromium'})
const page = await browser.newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.opened = []; window.open = url => { window.opened.push(url) } })
try {
  await page.goto('http://127.0.0.1:4390/examples/newsletters.html?pending=300')
  const rows = () => page.$$eval('.tk-row', rs => rs.map(r => `${r.dataset.id.split(':')[0]}|${r.querySelector('.qs-tag').textContent}|${r.querySelector('[data-proposed]')?.firstChild.textContent ?? ''}`))
  const row = domain => `.tk-row[data-id^="${domain}:"]`
  await page.waitForFunction(() => [...document.querySelectorAll('.qs-group')].some(x => /spurt/.test(x.textContent)))
  // One row per sender: Jev's proposal in the tag and as the dashed (proposed) button.
  assert.deepEqual(await rows(), ['shop.example|Kuppis/Tilbud|Kuppis/Tilbud', 'club.example||', 'friend.example|Svar|Svar…',
    'news.example|Arkiver|Arkiver', 'spam.example|Avmeld|Avmeld…'])
  const press = async key => { await page.focus('.tk-list'); await page.keyboard.press(key) }
  // Split view: the pane shows the cursor's sender, what Enter does, and its newest email.
  await page.waitForFunction(() => /Jev foreslår «Kuppis\/Tilbud»/.test(document.querySelector('#pane header')?.textContent))
  assert.match(await page.frameLocator('#pane iframe').locator('#body').textContent(), /Body of 2/)
  // ← → move the marked answer in the pane, starting on Jev's proposal.
  const markedButton = () => page.textContent('#pane .keys button[data-marked]')
  assert.match(await markedButton(), /^Kuppis\/Tilbud K ↵$/)
  await press('ArrowRight')
  assert.match(await markedButton(), /^Avmeld… X ↵$/)
  await press('ArrowLeft')
  assert.match(await markedButton(), /^Kuppis\/Tilbud K ↵$/)
  await press('ArrowDown')
  await page.waitForFunction(() => /club\.example/.test(document.querySelector('#pane h2')?.textContent))
  assert.match(await page.frameLocator('#pane iframe').locator('#body').textContent(), /Body of 6/)
  await press('ArrowUp')
  const status = () => page.textContent('.tk-status')
  const tasks = () => posts.filter(p => p.path === '/api/background_tasks')
  // Enter applies the proposal; U within the pending window calls it back.
  await page.click(row('shop.example')); await press('Enter')
  assert.equal(await page.$(row('shop.example')), null)
  await press('u')
  assert.ok(await page.$(row('shop.example')))
  await page.waitForTimeout(500)
  assert.equal(tasks().length, 0, 'undone decision never reaches the mail backend')
  // Enter again and let it go: one archive_kuppis task for every email from that sender.
  await page.click(row('shop.example')); await press('Enter')
  await page.waitForFunction(() => /Sendt/.test(document.querySelector('.tk-status').textContent))
  assert.deepEqual(tasks().find(p => p.kind === 'archive_kuppis').selections, [{id: 2, version: 1}, {id: 1, version: 1}])
  // A letter overrides the proposal.
  await page.click(row('news.example')); await press('a')
  await page.waitForFunction(() => /Arkiver · news/.test(document.querySelector('.tk-status').textContent))
  assert.deepEqual(tasks().filter(p => p.kind === 'archive').at(-1).selections, [{id: 3, version: 1}])
  // Unsubscribe always asks first; cancel undoes the decision and sends nothing.
  await page.click(row('spam.example')); await press('Enter')
  await page.waitForSelector('dialog[open]')
  assert.match(await page.textContent('#confirm-list'), /spam\.example/)
  await page.keyboard.press('Escape')
  await page.waitForSelector(row('spam.example'))
  await page.waitForTimeout(500)
  assert.equal(tasks().some(p => p.kind === 'archive_unsubscribe'), false)
  assert.match(await status(), /avbrutt/)
  await page.click(row('spam.example')); await press('x')
  await page.waitForSelector('dialog[open]'); await page.keyboard.press('j')
  await page.waitForFunction(() => /Avmeld · spam/.test(document.querySelector('.tk-status').textContent))
  assert.deepEqual(tasks().find(p => p.kind === 'archive_unsubscribe').selections, [{id: 4, version: 1}])
  // Reply only opens the thread in Gmail: nothing is sent.
  const before = posts.length
  await page.click(row('friend.example')); await press('Enter')
  assert.deepEqual(await page.evaluate(() => window.opened), ['https://mail.google.com/#all/5'])
  await page.waitForTimeout(500)
  assert.equal(posts.length, before)
  // Keep sends nothing and is remembered across a reload.
  await page.click(row('club.example')); await press('b')
  await page.reload(); await page.waitForSelector('.tk-list')
  assert.equal(await page.$(row('club.example')), null)
  assert.match(await page.textContent('.tk-header nav'), /Behold1/)
  assert.equal(posts.filter(p => p.path !== 'jev_decision').length, before - posts.slice(0, before).filter(p => p.path === 'jev_decision').length)
  assert.deepEqual(errors, [])
  console.log('newsletters e2e: ok')
} finally {
  await browser.close(); server.kill(); fake.close()
}
