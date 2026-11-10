/** Column widths in order: a number is a fixed width in px, `null` a flexible column. */
export type ColumnWidths = (number|null)[]
/** Move the boundary after column `index` by `dx` px. Returns a new array, or the same one when neither side is fixed. */
export function resizeColumn(widths:ColumnWidths, index:number, dx:number, min?:number):ColumnWidths
/** The widths as a `grid-template-columns` value. */
export function columnTemplate(widths:ColumnWidths):string
/** Saved widths when they still fit the defaults, else a copy of the defaults. */
export function readWidths(storage:Pick<Storage,'getItem'>|null|undefined, key:string, defaults:ColumnWidths):ColumnWidths
export type ColumnResizeOptions = {
  /** Default widths, one per header cell that takes part; later cells get no handle. */
  widths:ColumnWidths
  storage?:Pick<Storage,'getItem'|'setItem'>|null
  storageKey:string
  /** Smallest width of a fixed column in px. Default 24. */ min?:number
  /** Called at mount and on every change; set the grid columns here. */
  apply(template:string, widths:ColumnWidths):void
  /** Tooltip on the handles. */ label?:string
}
/** Add drag handles to a `.tk-head` row. Double-click a handle to restore the defaults. */
export function mountColumnResize(head:Element, options:ColumnResizeOptions):{readonly widths:ColumnWidths; reset():void}
