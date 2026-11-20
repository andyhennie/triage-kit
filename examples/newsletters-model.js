// Newsletter triage over the mail backend's /api/state: which emails belong in the list, what Jev
// proposes for each, and the sender groups. Pure functions, no DOM, so Node tests run them.

export const ACTIONS = {
  archive: {label: 'Arkiver', key: 'a'},
  kuppis: {label: 'Kuppis/Tilbud', key: 'k'},
  unsubscribe: {label: 'Avmeld', key: 'x', confirm: true},   // reaches the sender: always confirmed
  reply: {label: 'Svar', key: 'r', confirm: true},           // reaches a person: only opens the thread
  task: {label: 'Oppgave', key: 't'},
  keep: {label: 'Behold', key: 'b'},
}

const LIST_QUEUES = ['jev_offers', 'jev_newsletters', 'jev_other_newsletters', 'jev_product_updates', 'jev_unsubscribe']
// Jev kinds that on their own mean the email is done once read.
const DONE_QUEUES = new Set(['jev_newsletters', 'jev_other_newsletters', 'jev_product_updates', 'jev_accounts_archive', 'jev_reminders', 'jev_memberships', 'jev_work'])
// What Jev's one next-step Choice (the backend's JevDecision) maps to here.
export const FROM_DECISION = {archive: 'archive', save_offer: 'kuppis', unsubscribe: 'unsubscribe', reply: 'reply', task: 'task', keep: 'keep'}

// A newsletter or offer still in the inbox and not already being handled elsewhere. A rule
// queue (FINN, security, school …) wins over Jev, as it does in the backend.
export function inList(item) {
  if (item.planned_actions?.length || item.snooze_status || item.rad_task) return false
  if (item.automatic_queue && item.automatic_queue !== 'jev_newsletters') return false
  const queues = item.jev?.queues || []
  return item.automatic_queue === 'jev_newsletters' || queues.some(q => LIST_QUEUES.includes(q))
}

// Jev's existing typed answers settle the proposal when exactly one action follows from them
// and nothing relevant is unclear. Otherwise null: ask Jev's next-step Choice.
export function fromQueues(item) {
  const queues = new Set(item.jev?.queues || [])
  if (item.automatic_queue === 'jev_newsletters') queues.add('jev_newsletters')
  if (item.jev?.needs_context?.length) return null
  const wants = [['jev_personal', 'reply'], ['jev_action', 'task'], ['jev_unsubscribe', 'unsubscribe'], ['jev_offers', 'kuppis']]
    .filter(([q]) => queues.has(q)).map(([, a]) => a)
  if (wants.length === 1) return wants[0]
  if (wants.length === 0 && [...queues].some(q => DONE_QUEUES.has(q))) return 'archive'
  return null
}

export function proposal(item, decisions = {}) {
  const d = decisions[item.id]
  return fromQueues(item) ?? (d ? FROM_DECISION[d.choice] ?? null : null)
}

export function senderDomain(sender = '') {
  const address = sender.match(/<([^>]+)>/)?.[1] ?? sender
  return (address.split('@')[1] || address).trim().toLowerCase() || '(ukjent)'
}

export function senderName(sender = '') {
  return sender.replace(/\s*<[^>]*>\s*/, '').replace(/^"|"$/g, '').trim() || senderDomain(sender)
}

// The group's proposal is its most common row proposal; ties go to the gentler action.
const GENTLE = ['keep', 'reply', 'task', 'archive', 'kuppis', 'unsubscribe']
export function groupProposal(proposals) {
  const counts = new Map()
  for (const p of proposals) if (p) counts.set(p, (counts.get(p) || 0) + 1)
  let best = null
  for (const [p, n] of counts) if (!best || n > counts.get(best) || (n === counts.get(best) && GENTLE.indexOf(p) < GENTLE.indexOf(best))) best = p
  return {proposal: best, agree: best ? counts.get(best) : 0, total: proposals.length}
}

// Sender groups, largest first, each with its emails newest first.
export function groups(items) {
  const by = new Map()
  for (const item of items) {
    const domain = senderDomain(item.sender)
    if (!by.has(domain)) by.set(domain, {domain, name: senderName(item.sender), items: []})
    by.get(domain).items.push(item)
  }
  for (const g of by.values()) g.items.sort((a, b) => String(b.received_at).localeCompare(String(a.received_at)))
  return [...by.values()].sort((a, b) => b.items.length - a.items.length || a.domain.localeCompare(b.domain))
}
