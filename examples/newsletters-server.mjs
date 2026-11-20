// Serves examples/newsletters.html and passes a short allowlist of mail backend API calls
// through, so the page can read the inbox and queue mail actions without CORS. The mail
// backend owns Gmail, Jev and every side effect; this file only forwards.
//
//   node examples/newsletters-server.mjs      # http://127.0.0.1:4296/
//   MAIL_API=http://127.0.0.1:4280 PORT=4296 (defaults)
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {extname, join, normalize} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const upstream = process.env.MAIL_API || 'http://127.0.0.1:4280'
const port = Number(process.env.PORT || 4296)
const KINDS = new Set(['archive', 'archive_kuppis', 'archive_unsubscribe'])
const ROUTES = [
  ['GET', /^\/api\/state$/], ['GET', /^\/api\/offers$/], ['POST', /^\/api\/items\/\d+\/links\/state$/], ['GET', /^\/api\/background_tasks$/], ['POST', /^\/api\/background_tasks$/],
  ['POST', /^\/api\/rad_tasks$/], ['GET', /^\/api\/items\/\d+\/preview$/], ['GET', /^\/api\/items\/\d+\/jev_decision$/], ['POST', /^\/api\/items\/\d+\/jev_decision$/],
]
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mjs': 'text/javascript'}

// Rails wants a session cookie and its CSRF token on every POST; fetch them like a browser would.
let session = null
async function csrf(fresh = false) {
  if (session && !fresh) return session
  const res = await fetch(upstream + '/')
  const token = (await res.text()).match(/<meta name="csrf-token" content="([^"]+)"/)?.[1]
  const cookie = res.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  if (!token) throw new Error('The mail backend gave no CSRF token')
  return session = {token, cookie}
}

async function forward(method, path, query, body) {
  for (const fresh of [false, true]) {
    const headers = {accept: 'application/json'}
    if (method === 'POST') {
      const s = await csrf(fresh)
      Object.assign(headers, {'content-type': 'application/json', 'x-csrf-token': s.token, cookie: s.cookie})
    }
    const res = await fetch(upstream + path + query, {method, headers, body})
    if (res.status === 422 && method === 'POST' && !fresh && /InvalidAuthenticityToken/.test(await res.clone().text())) continue
    return res
  }
}

async function readBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  return Buffer.concat(chunks).toString('utf8')
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local')
  try {
    if (url.pathname.startsWith('/api/')) {
      if (!ROUTES.some(([m, re]) => m === req.method && re.test(url.pathname))) return send(res, 404, {error: 'Not forwarded'})
      let body
      if (req.method === 'POST') {
        body = await readBody(req)
        if (url.pathname === '/api/background_tasks' && !KINDS.has(JSON.parse(body).kind)) return send(res, 400, {error: 'Unknown mail action'})
      }
      const up = await forward(req.method, url.pathname, url.search, body)
      const text = await up.text()
      res.writeHead(up.status, {'content-type': up.headers.get('content-type') || 'application/json', 'cache-control': 'no-store'})
      return res.end(/^\s*</.test(text) ? JSON.stringify({error: `The mail backend answered ${up.status}`}) : text)
    }
    if (url.pathname === '/') { res.writeHead(302, {location: '/examples/newsletters.html'}); return res.end() }
    const file = normalize(join(root, url.pathname))
    if (!/^\/(src|examples)\//.test(url.pathname) || !file.startsWith(root)) return send(res, 404, {error: 'Not found'})
    const data = await readFile(file)
    res.writeHead(200, {'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'})
    res.end(data)
  } catch (error) {
    send(res, error.code === 'ENOENT' ? 404 : 502, {error: error.code === 'ENOENT' ? 'Not found' : 'The mail backend is unavailable'})
  }
}).listen(port, '127.0.0.1', () => console.log(`newsletters: http://127.0.0.1:${port}/ → ${upstream}`))

function send(res, status, json) {
  res.writeHead(status, {'content-type': 'application/json'})
  res.end(JSON.stringify(json))
}
