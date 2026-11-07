import * as React from "react"
import { cn } from "@/lib/utils"
import { Kbd } from "@/components/ui/kbd"

// The current row's details. Hidden below 520 px of container width (the row is the card there).
export function TriageInspector({ className, ...props }: React.ComponentProps<"aside">) {
  return (
    <aside
      data-slot="triage-inspector"
      className={cn("hidden min-h-0 space-y-2 overflow-auto @min-[520px]:block", className)}
      {...props}
    />
  )
}

// One line listing the keys that work here: [["↑↓", "move"], ["U", "undo"]].
export function TriageHelp({ keys, className, ...props }: { keys: [string, string][] } & React.ComponentProps<"p">) {
  return (
    <p data-slot="triage-help" className={cn("flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground", className)} {...props}>
      {keys.map(([k, label]) => (
        <span key={k} className="whitespace-nowrap"><Kbd>{k}</Kbd> {label}</span>
      ))}
    </p>
  )
}

// An action button that shows its key and announces it (aria-keyshortcuts, title).
export function TriageAction({ shortcut, label, ariaKeys, className, children, ...props }:
  { shortcut: string; label?: string; ariaKeys: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-keyshortcuts={ariaKeys}
      title={`${label ?? ""} (${shortcut})`.trim()}
      className={cn("inline-flex h-7 items-center gap-1.5 rounded-md border bg-secondary px-2 text-xs font-medium hover:bg-secondary/80", className)}
      {...props}
    >
      {children ?? label}<Kbd>{shortcut}</Kbd>
    </button>
  )
}
