import type { KeyboardEvent, MouseEvent, RefObject } from 'react'
import type { BatchItem, Id, ListState, Route, RouteConfig } from './index.js'
import type { TriageState, TriageEvent } from './controller.js'

export type TriageApi<T extends Id> = {
  state: TriageState<T>
  run: (items: { id: T; decision: unknown }[], options?: RunOptions<T>) => Promise<boolean>
  undo: (label?: string | ((n: number) => string)) => unknown
  toast: (text: string) => void
  focus: () => void
}
export type RunOptions<T extends Id> = {
  label: string; left?: T[]; affected?: Set<T> | T[]; record?: BatchItem<T, any>[]; undone?: boolean
}
export type UseTriageListOptions<T extends Id> = RouteConfig & {
  ids: T[]
  commit: (items: { id: T; decision: any }[]) => Promise<unknown>
  /** Return false when the route was not handled, so the key is not swallowed. */
  onAction?: (route: Route, api: TriageApi<T>) => boolean | void
  /** The app owns undo (for example a server batch id); omit for the local stack. */
  onUndo?: (api: TriageApi<T>) => unknown
  /** Identity of the current queue; a change resets the selection. */
  queue?: unknown
  /** Listen on window instead of the list, so Ctrl+←→ works from sibling controls. */
  global?: boolean
  idPrefix?: string
}
export function useTriageList<T extends Id = string>(options: UseTriageListOptions<T>): {
  state: TriageState<T>; selection: Set<T>; current: T | null; toast: string; busy: boolean
  history: { items: BatchItem<T, any>[] }[]
  listProps: {
    ref: RefObject<any>; role: 'listbox'; 'aria-multiselectable': true; tabIndex: 0
    'aria-activedescendant': string | undefined; onKeyDown: ((e: KeyboardEvent) => void) | undefined
  }
  rowProps: (id: T) => {
    id: string; role: 'option'; 'aria-selected': boolean; 'data-current': '' | undefined
    onMouseDown: (e: MouseEvent) => void
  }
  run: TriageApi<T>['run']; undo: TriageApi<T>['undo']; focus: () => void
  setToast: (text: string) => void; dispatch: (event: TriageEvent<T>) => void
}
