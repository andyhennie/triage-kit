import type {ReactElement, ReactNode, KeyboardEventHandler, RefObject} from 'react'
import type {Id} from './index.js'
/** One single-line row: three cells on the list.css grid (`--tk-columns`). */
export type WorkbenchRow<T extends Id = string> = {
  id:T; title:ReactNode; leading?:ReactNode; trailing?:ReactNode
}
export type WorkbenchProps<T extends Id = string> = {
  title:ReactNode; navigation?:ReactNode; toolbar?:ReactNode
  /** Optional column labels for a `.tk-head` row on the same grid. */
  head?:ReactNode[]
  rows:WorkbenchRow<T>[]
  selection:Set<T>; current:T|null; onSelect:(id:T,extend:boolean)=>void
  onKeyDown?:KeyboardEventHandler<HTMLElement>; listRef?:RefObject<HTMLDivElement|null>
  inspectorRef?:RefObject<HTMLElement|null>; inspector?:ReactNode; actions?:ReactNode
  status?:ReactNode; busy?:boolean
  labels?:{list:string; inspector:string; empty:string; selected:(n:number,total:number)=>string}
}
export function TriageWorkbench<T extends Id = string>(props:WorkbenchProps<T>):ReactElement
