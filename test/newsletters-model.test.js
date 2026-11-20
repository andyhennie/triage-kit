import {test} from 'node:test'
import assert from 'node:assert/strict'
import {inList, fromQueues, proposal, groupProposal, groups, senderDomain} from '../examples/newsletters-model.js'

const mail = (queues, extra = {}) => ({id: Math.random(), sender: 'Shop <news@marketing.shop.no>', jev: {queues, needs_context: []}, automatic_queue: null, planned_actions: [], ...extra})

test('only newsletters and offers that nothing else is handling', () => {
  assert.ok(inList(mail(['jev_offers'])))
  assert.ok(!inList(mail(['jev_personal'])))
  assert.ok(!inList(mail(['jev_offers'], {automatic_queue: 'finn'})))
  assert.ok(!inList(mail(['jev_offers'], {planned_actions: ['archive']})))
  assert.ok(inList(mail([], {automatic_queue: 'jev_newsletters'})))
})

test('existing Jev answers settle a proposal only when exactly one action follows', () => {
  assert.equal(fromQueues(mail(['jev_offers'])), 'kuppis')
  assert.equal(fromQueues(mail(['jev_product_updates', 'jev_unsubscribe'])), 'unsubscribe')
  assert.equal(fromQueues(mail(['jev_newsletters'])), 'archive')
  assert.equal(fromQueues(mail(['jev_offers', 'jev_unsubscribe'])), null)
  assert.equal(fromQueues(mail(['jev_action', 'jev_newsletters', 'jev_unsubscribe'])), null)
  assert.equal(fromQueues(mail(['jev_newsletters'], {jev: {queues: ['jev_newsletters'], needs_context: ['jev_unsubscribe']}})), null)
  assert.equal(fromQueues(mail([])), null)
})

test('an open case takes Jev’s next-step choice, and nothing is guessed without it', () => {
  const m = mail(['jev_offers', 'jev_unsubscribe'])
  assert.equal(proposal(m, {}), null)
  assert.equal(proposal(m, {[m.id]: {choice: 'save_offer'}}), 'kuppis')
  assert.equal(proposal(m, {[m.id]: {choice: 'something_new'}}), null)
})

test('the group proposal is the most common one, ties go to the gentler action', () => {
  assert.deepEqual(groupProposal(['kuppis', 'kuppis', 'archive']), {proposal: 'kuppis', agree: 2, total: 3})
  assert.equal(groupProposal(['unsubscribe', 'archive']).proposal, 'archive')
  assert.equal(groupProposal([null, null]).proposal, null)
})

test('groups by sender domain, largest first, newest email first', () => {
  const a = {sender: 'A <x@a.no>', received_at: '2026-11-01'}, b = {sender: 'A <y@a.no>', received_at: '2026-11-03'}, c = {sender: 'c@b.no', received_at: '2026-11-02'}
  const g = groups([a, c, b])
  assert.deepEqual(g.map(x => x.domain), ['a.no', 'b.no'])
  assert.deepEqual(g[0].items, [b, a])
  assert.equal(senderDomain('"Komplett" <nyhetsbrev@marketing.komplett.no>'), 'marketing.komplett.no')
})
