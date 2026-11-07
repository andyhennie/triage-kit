import { useMemo, useState } from 'react'
import { batchFor, MAX_BATCH } from 'triage-kit'
import { useTriageList } from 'triage-kit/react'
import { TriageColumns, TriageLayout, TriageListbox, TriageRow } from '@/components/triage/triage-listbox'
import { TriageAction, TriageHelp, TriageInspector } from '@/components/triage/triage-inspector'
import { TriageFooter } from '@/components/triage/triage-footer'

// A made-up inbox of invoices: decide keep / later / trash, or approve the suggestion.
type Decision = 'keep' | 'later' | 'trash'
type Row = { id: string; title: string; amount: number; suggestion: Decision | null; decision: Decision | null }
const LABEL: Record<Decision, string> = { keep: 'Keep', later: 'Later', trash: 'Trash' }
const KEYS: Record<string, Decision> = { 1: 'keep', 2: 'later', 3: 'trash' }
const NAMES = ['Paper supplies', 'Cloud hosting', 'Train ticket', 'Team lunch', 'Domain renewal', 'Office chair', 'Conference pass', 'Taxi', 'Software licence', 'Printer ink']
const seed = (): Row[] => Array.from({ length: 40 }, (_, i) => ({
  id: `r${i + 1}`, title: `${NAMES[i % NAMES.length]} #${i + 1}`, amount: Math.round(((i * 7919) % 5000) + 99),
  suggestion: i % 5 === 4 ? null : (['keep', 'later', 'trash'] as const)[i % 3], decision: null,
}))

// Test hooks for the e2e: count commits, fail the next one, or hold commits until released.
declare global { interface Window { __commits: number; __failNext?: boolean; __gate?: Promise<void> } }
window.__commits = 0

export function App() {
  const [rows, setRows] = useState(seed)
  const [onlyOpen, setOnlyOpen] = useState(true)
  const shown = useMemo(() => rows.filter((r) => !onlyOpen || !r.decision), [rows, onlyOpen])
  const ids = shown.map((r) => r.id)

  // The "server": applies a whole batch or nothing.
  const commit = async (items: { id: string; decision: Decision | null }[]) => {
    window.__commits++
    await (window.__gate ?? new Promise((r) => setTimeout(r, 150)))
    if (window.__failNext) { window.__failNext = false; throw new Error('Could not save – nothing changed') }
    const by = new Map(items.map((i) => [i.id, i.decision]))
    setRows((rs) => rs.map((r) => (by.has(r.id) ? { ...r, decision: by.get(r.id)! } : r)))
  }

  const t = useTriageList<string>({
    ids, commit,
    keys: { 1: 'set:keep', 2: 'set:later', 3: 'set:trash' },
    enter: 'approve', open: false,
    onAction: (route): boolean | void => {
      if (route.action === 'approve') { decide(); return }
      if (route.action.startsWith('set:')) { decide(route.action.slice(4) as Decision); return }
      return false
    },
  })

  function decide(decision?: Decision): void {
    const { items, skipped, tooMany } = batchFor(shown.map((r) => ({ id: r.id, proposal: r.suggestion, decision: r.decision })), t.selection, decision)
    if (tooMany) { t.setToast(`At most ${MAX_BATCH} at a time – filter first`); return }
    if (!items.length) { t.setToast(skipped.length ? `${skipped.length} without a suggestion – pick 1–3` : 'Nothing to change'); return }
    const left = onlyOpen ? items.map((i) => i.id) : []
    const label = `${decision ? LABEL[decision] : 'Approved'} ${items.length}${skipped.length ? ` (${skipped.length} skipped)` : ''}`
    void t.run(items, { label, left, affected: left, record: items })
  }

  const cur = shown.find((r) => r.id === t.current)
  const total = shown.filter((r) => t.selection.has(r.id)).reduce((s, r) => s + r.amount, 0)
  const help: [string, string][] = [['↑↓', 'move'], ['⇧↑↓', 'extend'], ['⌘A', 'all'], ['1', 'keep'], ['2', 'later'], ['3', 'trash'], ['↵', 'approve'], ['U', 'undo']]

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col gap-2 p-3">
      <header className="flex items-center gap-3 text-sm">
        <b>triage-kit demo</b>
        <span className="text-muted-foreground">{rows.filter((r) => r.decision).length} of {rows.length} decided</span>
        <label className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} data-testid="only-open" /> Only open
        </label>
      </header>
      <TriageLayout className="min-h-0 flex-1">
        <TriageColumns>
          <TriageListbox {...t.listProps} aria-label="Invoices" data-testid="list">
            {shown.map((r) => (
              <TriageRow key={r.id} {...t.rowProps(r.id)} data-testid="row" className={r.decision ? 'opacity-60' : ''}>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="shrink-0 rounded-full border px-1.5 text-xs">{r.decision ? LABEL[r.decision] : r.suggestion ? `→ ${LABEL[r.suggestion]}` : 'check'}</span>
                <span className="w-16 shrink-0 text-right tabular-nums">{r.amount}</span>
              </TriageRow>
            ))}
            {!shown.length && <li className="p-6 text-center text-muted-foreground">All done ✓</li>}
          </TriageListbox>
          {cur && (
            <TriageInspector data-testid="inspector">
              <h2 className="text-base font-semibold">{cur.title}</h2>
              <p className="text-sm tabular-nums">{cur.amount} kr</p>
              <p className="text-sm text-muted-foreground">Suggestion: {cur.suggestion ? LABEL[cur.suggestion] : 'none – decide yourself'}</p>
              <div className="flex flex-wrap gap-1.5">
                {cur.suggestion && <TriageAction shortcut="↵" ariaKeys="Enter" label="Approve" onClick={() => decide()} />}
                {Object.entries(KEYS).map(([k, d]) => <TriageAction key={k} shortcut={k} ariaKeys={k} label={LABEL[d]} onClick={() => decide(d)} data-testid={`action-${d}`} />)}
              </div>
              <TriageHelp keys={help} data-testid="help" />
            </TriageInspector>
          )}
        </TriageColumns>
        <TriageFooter selected={t.selection.size} total={`${total} kr`} toast={t.toast} data-testid="footer">
          <TriageHelp keys={help} />
        </TriageFooter>
      </TriageLayout>
    </div>
  )
}
