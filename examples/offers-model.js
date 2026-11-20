// Offers read out of store emails (the mail backend's /api/offers), merged into products: the same
// product from several stores or emails is one card, cheapest first. Pure functions.

export const CATEGORIES = {sport: 'Sport', electronics: 'Elektronikk', clothing: 'Klær', home: 'Hjem', food: 'Mat', health: 'Helse', travel: 'Reise', other: 'Annet'}

// What kind of thing a product is (the backend's OfferKinds, judged by Jev), in list order.
export const KINDS = {jacket: 'Jakker', pants: 'Bukser', shoes: 'Sko', base_layer: 'Ullundertøy', top: 'Gensere og topper', accessory: 'Tilbehør',
  eyewear: 'Briller og hjelm', skis: 'Ski', sports_equipment: 'Utstyr', phone_tablet: 'Mobil og nettbrett', computer: 'PC og skjerm', audio_tv: 'Lyd og bilde',
  appliance: 'Hvitevarer', home: 'Hjem', campaign: 'Kampanjer', other: 'Annet'}
// What the product is for (the backend's OfferKinds, judged by Jev). 'none' is not a sport.
export const ACTIVITIES = {cross_country: 'Langrenn', alpine: 'Alpint og topptur', running: 'Løping', hiking: 'Tur og friluft', cycling: 'Sykkel',
  training: 'Trening', climbing: 'Klatring', everyday: 'Hverdag'}
// Who to shop for: each choice is the audiences (Jev) it lets through; an unjudged product
// is shown to everyone rather than hidden.
export const WHO = {me: {label: 'Til meg', audiences: ['men', 'everyone']}, partner: {label: 'Til partner', audiences: ['women']},
  kids: {label: 'Til barn', audiences: ['children']}, all: {label: 'Alle', audiences: null}}
export const forWho = (product, who) => !WHO[who]?.audiences || !product.audience || WHO[who].audiences.includes(product.audience)

// "Apple Watch Series 12 GPS 46mm aluminium (space grey)" and "Apple Watch Series 12 GPS
// 46 mm Aluminium" are one product: colour notes, case, punctuation and unit spacing go.
export function productKey(title = '') {
  return title.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/(\d)\s+(gb|tb|mm|cm|kg|w|l|g)\b/g, '$1$2')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

// "11 590,-" → 11590, "1 299,50 kr" → 1299.5, no number → Infinity (sorts last).
export function priceNumber(price = '') {
  const m = String(price).replace(/\s| /g, '').match(/\d[\d.]*(?:,\d{1,2})?/)
  if (!m) return Infinity
  const [whole, cents] = m[0].split(',')
  return Number(whole.replace(/\./g, '')) + (cents ? Number(`0.${cents}`) : 0)
}

// [{title, category, image, offers: [cheapest first], state}] in first-seen order. A product is
// 'new' while any of its offers is undecided, 'saved' if one was saved, else 'done'.
export function products(offers) {
  const by = new Map()
  for (const offer of offers) {
    const key = productKey(offer.title)
    if (!key) continue
    if (!by.has(key)) by.set(key, {key, title: offer.title, offers: []})
    by.get(key).offers.push(offer)
  }
  return [...by.values()].map(p => {
    const sorted = [...p.offers].sort((a, b) => priceNumber(a.price) - priceNumber(b.price))
    const states = sorted.map(o => o.state || 'new'), counts = {}
    for (const o of sorted) counts[o.category || 'other'] = (counts[o.category || 'other'] || 0) + 1
    return {...p, offers: sorted, image: sorted.find(o => o.image)?.image ?? null,
      audience: sorted.find(o => o.audience)?.audience ?? null, kind: sorted.find(o => o.kind)?.kind ?? null,
      activity: sorted.find(o => o.activity)?.activity ?? null,
      category: Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0],
      stores: [...new Set(sorted.map(o => o.store))],
      state: states.includes('new') ? 'new' : states.includes('saved') ? 'saved' : 'done'}
  })
}
