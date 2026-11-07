import * as React from "react"
import { cn } from "@/lib/utils"

// List and inspector side by side from 520 px of container width; below that, one column.
// Only the list scrolls: the layout fills its parent's height.
export function TriageLayout({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("@container flex h-full min-h-0 flex-col", className)} {...props} />
}

export function TriageColumns({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("min-h-0 flex-1 @min-[520px]:grid @min-[520px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @min-[520px]:gap-3", className)}
      {...props}
    />
  )
}

// Spread listProps from useTriageList onto it: role=listbox, aria-*, tabIndex, keys.
export const TriageListbox = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  function TriageListbox({ className, ...props }, ref) {
    return (
      <div className="min-h-0 overflow-auto" data-slot="triage-scroll">
        <ul
          ref={ref}
          data-slot="triage-listbox"
          className={cn("space-y-0.5 rounded-md p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50", className)}
          {...props}
        />
      </div>
    )
  },
)

// Spread rowProps(id): role=option, aria-selected, data-current, onMouseDown.
export function TriageRow({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="triage-row"
      className={cn(
        "flex cursor-default items-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm select-none",
        "hover:bg-accent/60 aria-selected:bg-primary/15 data-[current]:border-primary/60",
        className,
      )}
      {...props}
    />
  )
}
