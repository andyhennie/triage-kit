import type {Id} from './index.js'
export type QuestionTone = 'ok'|'info'|'warn'|'bad'|'muted'
/** One line to answer. `title` is the full text; the row grows to show all of it. */
export type QuestionItem<T extends Id = string> = {
  id:T; title:string
  /** Short first cell, e.g. a number. */ leading?:string
  /** Third cell, e.g. an area or source. */ group?:string
  /** Fourth cell, a short status word, coloured by `tone`. */ tag?:string; tone?:QuestionTone
}
export type QuestionDecision = {
  id:string; label:string
  /** Tooltip and export wording when it differs from the label. */ long?:string
  /** `KeyboardEvent.key` values, e.g. `['1']` or `['s']`. Reserved: ↑ ↓ ← → Space Enter C U, Ctrl+arrows. */
  keys?:string[]
  /** What the button shows for the key, e.g. `'1'`. */ kbd?:string
  tone?:QuestionTone
  /** With `comment` on: after this answer on one row, keep the row in place and open its comment. */
  comment?:boolean
}
export type QuestionsLabels = {
  open:string; all:string; list:string; empty:string; comment:string
  resize:string; undo:string; undone:string; nothingToUndo:string; unchanged:string
  selected:(n:number,total:number)=>string
}
export type QuestionsApi<T extends Id = string> = {
  /** Decision id by item id; undecided items are absent. */ readonly decisions:Record<string,string>
  readonly comments:Record<string,string>
  rows():(QuestionItem<T>&{decision:string|null; comment:string})[]
  /** Show a line in the status region. */ toast(text:string):void
  /** Clear decisions, comments and undo history. */ reset():void
}
export type QuestionsConfig<T extends Id = string> = {
  title:string; items:QuestionItem<T>[]; decisions:QuestionDecision[]
  /** Key for decisions, comments and undo history in `storage`. */ storageKey:string
  /** Default `localStorage`; `null` keeps state in memory only. */ storage?:Pick<Storage,'getItem'|'setItem'>|null
  /** A free-text comment per item: C opens it in the row, Esc returns to the list. */ comment?:boolean
  /** Five header labels for leading, title, group, tag and the answer buttons. */ columns?:string[]
  /** Default px widths of leading, title, group and tag; `null` is the flexible one. Default `[32, null, 150, 84]`. */
  columnWidths?:(number|null)[]
  /** Drag handles in the header change the widths, saved under `storageKey + ':columns'`. Default true. */
  resizable?:boolean
  /** App buttons in the toolbar. */ actions?:{label:string; run(api:QuestionsApi<T>):void}[]
  /** Help text, closed until clicked. */ help?:{summary:string; lines:string[]}
  labels?:Partial<QuestionsLabels>
  onChange?(api:QuestionsApi<T>):void
}
/** Render a question list into `root` (replacing its children) and focus the list. */
export function mountQuestions<T extends Id = string>(root:Element, config:QuestionsConfig<T>):QuestionsApi<T>
