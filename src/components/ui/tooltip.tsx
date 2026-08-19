"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "@/lib/utils"

// A short, plain-text hint for an icon-only control — content is the
// trigger's own accessible name (aria-label), rendered on hover/focus so
// sighted users get the same description a screen reader already has.
function Tooltip({
  children,
  content,
  side = "top",
  className,
}: {
  children: React.ReactElement
  content: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}) {
  return (
    <TooltipPrimitive.Provider delay={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger render={children} />
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Positioner side={side} sideOffset={6} className="z-50">
            <TooltipPrimitive.Popup
              className={cn(
                "rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                className,
              )}
            >
              {content}
            </TooltipPrimitive.Popup>
          </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

export { Tooltip }
