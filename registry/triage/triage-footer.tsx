import * as React from "react"
import { cn } from "@/lib/utils"
import { TriageToast } from "@/components/triage/triage-toast"

// "N selected · total", optional key hints in the middle, the toast on the right.
export function TriageFooter({ selected, total, toast, selectedLabel = (n) => `${n} selected`, className, children, ...props }:
  { selected: number; total?: React.ReactNode; toast?: React.ReactNode; selectedLabel?: (n: number) => React.ReactNode } & React.ComponentProps<"div">) {
  return (
    <div data-slot="triage-footer" className={cn("flex items-center justify-between gap-3 border-t px-1 py-1.5 text-xs text-muted-foreground", className)} {...props}>
      <span className="shrink-0 whitespace-nowrap">{selectedLabel(selected)}{total != null && <> · {total}</>}</span>
      <span className="hidden min-w-0 flex-1 overflow-hidden @min-[520px]:block [&_[data-slot=triage-help]]:flex-nowrap">{children}</span>
      <TriageToast className="shrink-0">{toast}</TriageToast>
    </div>
  )
}
