import * as React from "react"
import { cn } from "@/lib/utils"

// Pending ("Keep 3 …") then the result, announced politely to screen readers.
export function TriageToast({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span role="status" aria-live="polite" data-slot="triage-toast" className={cn("truncate whitespace-nowrap", className)} {...props}>
      {children}
    </span>
  )
}
