// Evaluated in the example page by a browser driver; returns the layout facts the proofs check.
(() => {
  const list = document.querySelector('.tk-list')
  const rows = [...list.querySelectorAll('.tk-row')]
  const heights = [...new Set(rows.map(r => Math.round(r.getBoundingClientRect().height * 100) / 100))]
  const wrapped = [...list.querySelectorAll('.tk-cell')].filter(c => c.getBoundingClientRect().height > rows[0].getBoundingClientRect().height).length
  return JSON.stringify({
    width: innerWidth,
    coarse: matchMedia('(pointer: coarse)').matches,
    heights,
    wrapped,
    horizontalOverflow: list.scrollWidth > list.clientWidth,
    activedescendant: list.getAttribute('aria-activedescendant'),
    selected: rows.filter(r => r.getAttribute('aria-selected') === 'true').map(r => r.id),
    accent: getComputedStyle(list).getPropertyValue('--tk-accent').trim(),
  })
})()
