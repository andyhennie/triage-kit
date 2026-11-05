# triage-kit

Keyboard-first triage lists: a queue of items you decide on, quickly, with the
keyboard. This package is the dependency-free core: selection, key routing and
the batch/undo shape. It is plain ES modules with TypeScript types and no
runtime dependencies, so it runs in any framework, in Node tests and in a
`<script type="module">`.

```sh
npm install github:andyhennie/triage-kit#v0.1.0
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

## Tests

```sh
npm test
```

The selection tests are the reference implementation's own, unchanged.
