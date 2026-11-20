import {test} from 'node:test'
import assert from 'node:assert/strict'
import {productKey, priceNumber, products, forWho} from '../examples/offers-model.js'

test('the same product named slightly differently is one key', () => {
  assert.equal(productKey('Apple Watch Series 12 GPS 46mm aluminium (space grey)'), productKey('Apple Watch Series 12 GPS 46 mm Aluminium'))
  assert.notEqual(productKey('Google Pixel 11 Pro 256GB'), productKey('Google Pixel 11 Pro 512GB'))
  assert.equal(productKey('Apple Watch Series 12 GPS 46 mm'), 'apple watch series 12 gps 46mm')
})

test('prices are read as numbers, and a missing price sorts last', () => {
  assert.equal(priceNumber('11 590,-'), 11590)
  assert.equal(priceNumber('1 299,50 kr'), 1299.5)
  assert.equal(priceNumber('kr 2.990'), 2990)
  assert.equal(priceNumber(''), Infinity)
})

test('offers merge across stores, cheapest first, with one picture and one state', () => {
  const list = products([
    {title: 'Sony WH-1000XM6', store: 'elkjop.no', price: '3 990,-', category: 'electronics', state: 'done'},
    {title: 'Swix ski poles', store: 'xxl.no', price: '499,-', category: 'sport', image: 'https://x/p.jpg'},
    {title: 'Sony WH-1000XM6 (black)', store: 'komplett.no', price: '3 490,-', category: 'electronics', image: 'https://k/s.jpg'},
  ])
  assert.deepEqual(list.map(p => [p.title, p.category, p.stores, p.state, p.image]), [
    ['Sony WH-1000XM6', 'electronics', ['komplett.no', 'elkjop.no'], 'new', 'https://k/s.jpg'],
    ['Swix ski poles', 'sport', ['xxl.no'], 'new', 'https://x/p.jpg']])
  assert.equal(list[0].offers[0].price, '3 490,-')
})

test('who to shop for filters on Jev\'s audience; an unjudged product is never hidden', () => {
  const [jacket, phone, unknown] = products([{title: 'Nora Jacket Dame', audience: 'women', kind: 'jacket'}, {title: 'Pixel 11', audience: 'everyone', kind: 'phone_tablet'}, {title: 'Mystery'}])
  assert.deepEqual([jacket.audience, jacket.kind, unknown.audience], ['women', 'jacket', null])
  assert.deepEqual([jacket, phone, unknown].map(p => forWho(p, 'me')), [false, true, true])
  assert.deepEqual([jacket, phone, unknown].map(p => forWho(p, 'partner')), [true, false, true])
  assert.deepEqual([jacket, phone, unknown].map(p => forWho(p, 'all')), [true, true, true])
})

test('a product carries its activity, so offers group as Sport › Langrenn › Ski', () => {
  const [ski] = products([{title: 'Fischer Speedmax 7 Classic', category: 'sport', activity: 'cross_country', kind: 'skis'}])
  assert.deepEqual([ski.category, ski.activity, ski.kind], ['sport', 'cross_country', 'skis'])
})
