export type Id = string | number
export type ListState<T extends Id = Id> = { selection: Set<T>; current: T | null; selectionAnchor: T | null }
export type KeyEventLike = {
  key: string; target?: EventTarget | { tagName?: string; isContentEditable?: boolean } | null
  metaKey?: boolean; shiftKey?: boolean; ctrlKey?: boolean; altKey?: boolean; isComposing?: boolean; repeat?: boolean
}
export type ListAction = 'all' | `move:${1 | -1}` | `extend:${1 | -1}`

export function selectOne<T extends Id>(state: ListState<T>, id: T | null, extend?: boolean): ListState<T>
export function selectRange<T extends Id>(state: ListState<T>, ids: T[], id: T): ListState<T> | null
export function selectAll<T extends Id>(state: ListState<T>, ids: T[]): ListState<T>
export function stepId<T extends Id>(ids: T[], current: T | null, delta: number): T | null
export function nextAfter<T extends Id>(ids: T[], current: T | null, removed: Set<T>): T | null
export function listKey(e: KeyEventLike): ListAction | null
export function applyListKey<T extends Id>(state: ListState<T>, ids: T[], action: string): ListState<T>
export function reconcile<T extends Id>(state: ListState<T>, ids: T[]): ListState<T>
export function afterAction<T extends Id>(args: {
  ids: T[]; current: T | null; selection: Set<T>; selectionAnchor?: T | null; affected?: Set<T> | T[]; left?: T[] | Set<T>; refused?: T[]
}): ListState<T>

export function isField(e: KeyEventLike): boolean
export function isControl(e: KeyEventLike): boolean
export type RouteConfig = {
  modal?: boolean; queues?: boolean; keys?: Record<string, string>; approveList?: boolean
  enter?: string | null; open?: boolean; undo?: boolean
}
export type Route = { action: string; arg?: string | number; repeat: boolean }
export function routeKey(e: KeyEventLike, config?: RouteConfig): Route | null

export const MAX_BATCH: 500
export type BatchItem<T extends Id = Id, D = string> = { id: T; decision: D; previous: D | null }
export function batchFor<T extends Id, D = string>(
  rows: { id: T; proposal?: D | null; decision?: D | null }[], selection: Set<T>, decision?: D,
  options?: { usable?: (proposal: D | null | undefined) => boolean }
): { items: BatchItem<T, D>[]; skipped: T[]; tooMany: boolean }
export function undoOf<T extends Id, D = string>(batch: { items: BatchItem<T, D>[] }): { id: T; decision: D | null }[]
