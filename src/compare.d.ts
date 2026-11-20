export type CompareSpan = {start:number; end:number; kind?:string; label?:string}
export type CompareAxis = {min?:number; max?:number; ticks?:number[]; shade?:[number,number][]}
export type CompareField<T> = {
  id?:string; label:string
  value?:(item:T)=>unknown
  format?:(value:any,item:T)=>string
  /** Mark the lowest or highest number and show every other cell's distance to it. */
  better?:'low'|'high'
  /** Mark the cells when their text is not the same in every column. */
  differs?:boolean
  /** Bars on one shared axis, e.g. flights and layovers on a 24 h day. */
  spans?:(item:T)=>CompareSpan[]|null|undefined
  axis?:CompareAxis
}
export type CompareCell = {text:string; value:unknown; best:boolean; delta:number|null; differs:boolean; spans:CompareSpan[]|null}
export type CompareRow = {id:string; label:string; cells:CompareCell[]}
export function compareRows<T>(items:T[], fields:CompareField<T>[]):CompareRow[]
export function spanBox(span:{start:number; end:number}, axis?:CompareAxis):{left:number; width:number}
export type CompareConfig<T> = {
  items:T[]; fields:CompareField<T>[]
  title?:(item:T)=>string; subtitle?:(item:T)=>string
  formatDelta?:(delta:number, field:CompareField<T>)=>string
  labels?:{label?:string}
}
export function mountCompare<T>(root:HTMLElement, config:CompareConfig<T>):{update(items:T[]):void; destroy():void}
