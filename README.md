# triage-kit

Keyboard-first triage lists: a queue of items you decide on, quickly, with the
keyboard. This package is the dependency-free core: selection, key routing and
the batch/undo shape. It is plain ES modules with TypeScript types and no
runtime dependencies, so it runs in any framework, in Node tests and in a
`<script type="module">`.

```sh
npm install github:andyhennie/triage-kit#v0.2.1
```

## The model

The list shows the visible ids in order. Selection state is
`{selection: Set, current, selectionAnchor}`: `current` is the cursor (the row
an inspector shows), `selection` is what an action applies to, and
`selectionAnchor` is where a Shift-range starts. Every function takes a state
and returns a new one; nothing is mutated.

```js
import {routeKey, applyListKey, afterAction, batchFor, undoOf} from 'triage-kit'

list.addEventListener('keydown', e => {
  const r = routeKey(e, {keys: {1: 'set:keep', 2: 'set:trash'}})
  if (!r) return                 // not ours: leave the key alone
  e.preventDefault()
  if (e.repeat && !r.repeat) return
  if (r.action === 'list') state = applyListKey(state, ids, r.arg)
  // …domain actions, 'undo', 'open', 'inspect', 'queue', 'approveList'
})
```

## Keys

| Key | Action |
|---|---|
| ↑ / ↓ | Move the cursor (held at the ends); the selection becomes that row |
| ⇧↑ / ⇧↓ | Extend from the anchor |
| ⌘A | Select every visible row (not on key repeat) |
| Ctrl+← / Ctrl+→ | Previous / next queue (`queues: true`); also plain ← / → unless bound |
| your `keys` | One decision for all selected rows, bare or Shift-only, never repeated |
| ⌘↵ / Ctrl+↵ | Approve the whole list (`approveList: true`) |
| U | Undo the latest batch (repeat allowed) |
| O | Open the current item |
| ↵ | `enter` (default `'inspect'`) |

Guards, in this order: an open modal (`modal: true`), IME composition and
`contentEditable` own the keyboard. Text fields (`INPUT`, `SELECT`,
`TEXTAREA`) and focused controls (`BUTTON`, `SUMMARY`) keep their keys, except
Ctrl+←/→, which still works on a button. Ctrl and Alt letters are never bound.

Your `keys` are checked before the reserved keys (←/→, Enter, O, U), so an app
may bind ← to a decision or Enter to its main action on purpose. Ctrl+↵ is
accepted next to ⌘↵ because Super often belongs to the window manager on
Linux. Queue groups (Ctrl+↑/↓) are not part of v0.1.

## API

Selection: `selectOne`, `selectRange`, `selectAll`, `stepId`, `nextAfter`,
`listKey`, `applyListKey`, `reconcile` (after the visible rows change),
`afterAction` (cursor after a batch: the next untouched row below, else above;
refused rows stay selected).

Keys: `routeKey(e, config)` → `{action, arg?, repeat}` or `null`;
`isField`, `isControl`.

Batch: `batchFor(rows, selection, decision?, {usable})` → `{items, skipped,
tooMany}`. Without a `decision` each row gets its own `proposal` when
`usable(proposal)`; other rows are skipped, never guessed. `MAX_BATCH` is 500.
`undoOf(batch)` gives the items that restore the previous decisions.
`batchFor` is selection approval. "Approve list" (⌘↵ on a frozen visible list,
one common suggestion, refused when any row lacks it) is routed by `routeKey`
but left to the caller in v0.1.

## The contract, briefly

- One key press is one batch with its own id, all-or-nothing, at most 500 rows.
- Undo takes a batch id and refuses when an item changed since. Keep history on
  the server where you can, so U works after a reload; say so when an action
  cannot be undone.
- After an action, focus returns to the list. Show a pending toast at once,
  then the result, in a `role="status"` region.
- The list is `role="listbox"` with `aria-multiselectable="true"`,
  `tabindex="0"` and `aria-activedescendant`; rows are `role="option"` with
  `aria-selected`. Buttons show their key in `<kbd>` and carry
  `aria-keyshortcuts`.

## Styling without a framework

`triage-kit/list.css` styles the listbox markup above from any stack (server
templates, plain JS, React). It is optional and has no JavaScript.

```html
<link rel="stylesheet" href="…/triage-kit/src/list.css">
<div class="tk-head"><span>Sender</span><span>Subject</span><span>Date</span></div>
<div class="tk-list" role="listbox" aria-label="Inbox" aria-multiselectable="true"
     tabindex="0" aria-activedescendant="row-42">
  <div class="tk-row" id="row-42" role="option" aria-selected="true" data-current>
    <span class="tk-cell">Sender</span>
    <span class="tk-cell">Subject</span>
    <span class="tk-cell tk-num tk-muted">8. nov.</span>
  </div>
</div>
```

Rows are one 28 px line (at least 44 px on touch and narrow screens): each
`.tk-cell` holds text or inline elements and truncates with an ellipsis
(`<br>` is hidden). Selected rows get a background and a 3 px bar; the bar is
the focus indicator. `.tk-head` is an optional header on the same grid.
Every rule is inside `:where()`, so it has zero specificity and your own CSS
wins whatever the load order.

The look is a few variables, set on any ancestor. Colours read shadcn-style
app tokens first, so an app's palette and dark mode carry over:

| Variable | Default |
|---|---|
| `--tk-row-height` | `28px` |
| `--tk-row-pad-x` / `--tk-gap` | `20px` / `16px` |
| `--tk-columns` | `minmax(0, 20%) minmax(0, 1fr) fit-content(30%)` |
| `--tk-font-size` / `--tk-head-font-size` | `13px` / `11px` |
| `--tk-canvas` / `--tk-text` / `--tk-muted` | `--background` / `--foreground` / `--muted-foreground`, else `#fff` / `#18181b` / `#71717a` |
| `--tk-border` / `--tk-hover` | `--accent`, else `#f4f4f5` |
| `--tk-selection` / `--tk-accent` | `--selection` / `--selection-edge`, else `#e8eefd` / `#1147bb` |

A composition is its cells plus a few lines of CSS:

```css
.ledger { --tk-columns: 110px 80px 92px 90px 180px 150px 76px 100px; --tk-gap: 12px;
          --tk-font-size: 12px; --tk-head-font-size: 9px; }
.ledger .tk-head { text-transform: uppercase; letter-spacing: .36px; }
```

`examples/plain.html` shows two compositions on the core functions, without
React: `?look=mail` and `?look=ledger` (`examples/look-*.css`). Serve the repo
root (`python3 -m http.server`) and open it. `?override=before|after` loads
`examples/override.css` on either side of `list.css`.

## React

```js
import {useTriageList} from 'triage-kit/react'

const t = useTriageList({
  ids, commit: items => api.decide(items),          // all-or-nothing on your server
  keys: {1: 'set:keep', 2: 'set:trash'},
  onAction: route => { if (route.action.startsWith('set:')) decide(route.action.slice(4)); else return false },
})
// <ul {...t.listProps}>{rows.map(r => <li key={r.id} {...t.rowProps(r.id)}>…</li>)}</ul>
// t.run(items, {label, left, record}) · t.undo() · t.toast · t.selection · t.current
```

`useTriageList` is thin wiring over the pure `triageReducer` (exported from the
core, so the same state machine works without React). `run` moves the cursor
at once (contract §4), shows a pending toast, calls `commit`, then shows the
result or restores the selection, and returns focus to the list. A press while
a batch is in flight is dropped. `queue` resets the selection when it changes;
a failure from an older queue does not restore into the new one.

Undo: by default the hook keeps the last 50 batches in memory and replays the
previous decisions (lost on reload, no changed-since check). That is a
deviation from the contract's durable server history; pass `onUndo` to own
undo yourself, for example by posting the last batch id to your server.

React is an optional peer dependency: only `triage-kit/react` imports it.

## Optional React workbench

```jsx
import {TriageWorkbench} from 'triage-kit/workbench'
import 'triage-kit/workbench.css'   // page layout; imports list.css
```

A controlled page shell that renders the list markup above, with slots for
`navigation`, `toolbar`, optional `head` labels, `inspector`, `actions` and
`status`. Rows are `{id, leading?, title, trailing?}`, one line each (three
cells on `--tk-columns`). Pass `selection`, `current` and `onSelect(id,
extend)`; pass `listRef` and `onKeyDown` to connect the core key helpers or
your own adapter, and `inspectorRef` for Enter-to-inspect. Ctrl/⌘-click and
clicks on controls inside a row do not change the selection. Labels are
caller-owned.

The component owns no data, routes, decisions or undo history. Restyle it with
the same variables as `list.css`, set on any ancestor. React is an optional
peer; the core stays dependency-free. `node examples/workbench.mjs` writes a
static page to look at.

## shadcn components

Install from the registry in this repository (each item pins the matching
`triage-kit` release):

```sh
npx shadcn add https://raw.githubusercontent.com/andyhennie/triage-kit/v0.2.1/public/r/triage.json
```

| Item | What |
|---|---|
| `triage-listbox` | `TriageLayout`, `TriageColumns` (list and inspector side by side from 520 px of container width, only the list scrolls), `TriageListbox`, `TriageRow` |
| `triage-inspector` | `TriageInspector`, `TriageHelp` (one line of keys), `TriageAction` (button with `<kbd>`, `aria-keyshortcuts`, `title`); uses shadcn's `kbd` |
| `triage-footer` | "N selected · total", key hints, toast |
| `triage-toast` | `role="status"` live region |
| `triage` | all of the above |

## Demo

```sh
cd demo && npm install && npm run dev      # or: npm run build && npm run e2e
```

A made-up invoice queue with keep / later / trash, Enter to approve the
suggestion and U to undo. `demo/e2e.mjs` checks the contract in a real
browser: optimistic cursor while a request is pending, one request for a
double press, restore on failure, undo keeping the cursor, focus, guards on
buttons and fields, aria, and that only the list scrolls.

## Tests

```sh
npm test
```

The selection tests are the reference implementation's own, unchanged.
