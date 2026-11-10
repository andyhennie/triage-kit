import type {Id} from './index.js'
export type DecideTone = 'ok'|'info'|'warn'|'bad'|'muted'
/** One line to decide on. `title` is the full text: one truncated line in the list, whole in the inspector. */
export type DecideItem<T extends Id = string> = {
  id:T; title:string
  /** Short first cell, e.g. a number. */ leading?:string
  /** Third cell, e.g. an area or source. */ group?:string
  /** Fourth cell, a short status word, coloured by `tone`. */ tag?:string; tone?:DecideTone
}
export type Decision = {
  id:string; label:string
  /** Tooltip and export wording when it differs from the label. */ long?:string
  /** `KeyboardEvent.key` values, e.g. `['ArrowRight']` or `['1']`. Reserved: ↑ ↓ U Enter, Ctrl+arrows. */
  keys?:string[]
  /** What the button shows for the key, e.g. `'→'`. */ kbd?:string
  tone?:DecideTone
  /** With `comment` on: after this decision on one row, keep it in the inspector and focus its comment. */
  comment?:boolean
}
export type DecideLabels = {
  open:string; all:string; list:string; inspector:string; empty:string; comment:string
  undo:string; undone:string; nothingToUndo:string; unchanged:string
  selected:(n:number,total:number)=>string; many:(n:number)=>string
}
export type DecideApi<T extends Id = string> = {
  /** Decision id by item id; undecided items are absent. */ readonly decisions:Record<string,string>
  readonly comments:Record<string,string>
  rows():(DecideItem<T>&{decision:string|null; comment:string})[]
  /** Show a line in the status region. */ toast(text:string):void
  /** Clear decisions, comments and undo history. */ reset():void
}
export type DecideConfig<T extends Id = string> = {
  title:string; items:DecideItem<T>[]; decisions:Decision[]
  /** Key for decisions, comments and undo history in `storage`. */ storageKey:string
  /** Default `localStorage`; `null` keeps state in memory only. */ storage?:Pick<Storage,'getItem'|'setItem'>|null
  /** A free-text comment per item: Enter focuses it, Esc returns to the list. */ comment?:boolean
  /** Five header labels for leading, title, group, tag and decision. */ columns?:string[]
  /** App buttons in the toolbar. */ actions?:{label:string; run(api:DecideApi<T>):void}[]
  /** Help text, closed until clicked. */ help?:{summary:string; lines:string[]}
  labels?:Partial<DecideLabels>
  onChange?(api:DecideApi<T>):void
}
/** Render a decision list into `root` (replacing its children) and focus the list. */
export function mountDecide<T extends Id = string>(root:Element, config:DecideConfig<T>):DecideApi<T>
