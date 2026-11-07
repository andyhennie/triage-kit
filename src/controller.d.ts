import type { BatchItem, Id, ListState } from './index.js'
export const HISTORY_LIMIT: 50
export type TriageState<T extends Id = Id> = {
  sel: ListState<T>; history: { items: BatchItem<T, any>[] }[]; toast: string; busy: boolean; before: ListState<T> | null
}
export type TriageEvent<T extends Id = Id> =
  | { type: 'ids'; ids: T[] } | { type: 'list'; ids: T[]; arg: string } | { type: 'click'; ids: T[]; id: T; shift?: boolean }
  | { type: 'start'; ids: T[]; label: string; affected?: Set<T> | T[]; left?: T[] }
  | { type: 'done'; label: string; record?: BatchItem<T, any>[]; undone?: boolean }
  | { type: 'fail'; message: string; stale?: boolean } | { type: 'reset'; ids: T[] } | { type: 'toast'; toast: string }
export function initialTriage<T extends Id>(ids?: T[]): TriageState<T>
export function triageReducer<T extends Id>(state: TriageState<T>, event: TriageEvent<T>): TriageState<T>
