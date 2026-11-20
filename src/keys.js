// One keydown router in the order of the Triage contract. Pure: it reads the event and a
// config and returns {action, arg?, repeat} or null. null means "not ours": do not call
// preventDefault. repeat:false means a held key must not run the action again (still
// preventDefault it).
import {listKey} from './selection.js'

const FIELDS=['INPUT','SELECT','TEXTAREA']
// Focused controls keep their own Enter, Space and letters.
const CONTROLS=['BUTTON','SUMMARY']
export const isField=e=>FIELDS.includes(e.target?.tagName)
export const isControl=e=>CONTROLS.includes(e.target?.tagName)

// config: {modal, queues, keys:{key:action}, approveList, enter='inspect', open=true, undo=true}
export function routeKey(e,{modal=false,queues=false,keys={},approveList=false,enter='inspect',open=true,undo=true}={}){
  // 1–2. Modal layers own the keyboard; so do IME composition and rich-text editors.
  if(modal||e.isComposing||e.target?.isContentEditable)return null
  const plainMods=!e.metaKey&&!e.altKey&&!e.shiftKey
  // 3. Ctrl+←→ steps the queue from anywhere but a text field (it works on a button).
  if(queues&&e.ctrlKey&&plainMods&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&!isField(e))
    return {action:'queue',arg:e.key==='ArrowLeft'?-1:1,repeat:true}
  const target=isField(e)||isControl(e)
  // 4. Domain keys: bare or Shift-only, never on a field or control, never repeated.
  if(!e.metaKey&&!e.ctrlKey&&!e.altKey&&!target&&Object.hasOwn(keys,e.key))return {action:keys[e.key],repeat:false}
  // 5. ⌘↵ (or Ctrl+↵, since Super often belongs to the window manager) approves the list.
  if(approveList&&e.key==='Enter'&&!!e.metaKey!==!!e.ctrlKey&&!e.altKey&&!e.shiftKey&&e.target?.tagName!=='TEXTAREA')
    return {action:'approveList',repeat:false}
  // 6. ↑↓ ⇧↑↓ ⌘A.
  const list=listKey(e)
  if(list)return {action:'list',arg:list,repeat:list!=='all'}
  // 7. Everything below is a bare key outside fields and controls.
  if(e.metaKey||e.ctrlKey||e.altKey||target)return null
  // 8. Plain ←→ step the queue unless the app bound them above.
  if(queues&&!e.shiftKey&&(e.key==='ArrowLeft'||e.key==='ArrowRight'))return {action:'queue',arg:e.key==='ArrowLeft'?-1:1,repeat:true}
  // 9. O, U, Enter.
  if(e.shiftKey)return null
  if(open&&e.key.toLowerCase()==='o')return {action:'open',repeat:false}
  if(undo&&e.key.toLowerCase()==='u')return {action:'undo',repeat:true}
  if(enter&&e.key==='Enter')return {action:enter,repeat:false}
  return null
}
