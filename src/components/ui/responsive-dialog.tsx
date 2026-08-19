"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Tooltip } from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

interface ResponsiveDialogProps {
  // Deliberately two separate controlled open states rather than one shared
  // boolean: only one trigger is ever visible/clickable per viewport, but a
  // single shared `open` value would still flip BOTH Drawer and Dialog open
  // simultaneously (each doesn't know *why* its own prop became true) —
  // reintroducing the double-overlay problem this component exists to avoid.
  // The caller (e.g. closing on a successful submit) sets both false; only
  // whichever one is actually open does anything.
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  desktopOpen: boolean
  onDesktopOpenChange: (open: boolean) => void
  triggerLabel: string
  triggerVariant?: React.ComponentProps<typeof Button>["variant"]
  triggerClassName?: string
  // When set, the trigger renders as a compact icon-only button (Material
  // Symbols name) instead of visible text — triggerLabel still provides
  // the accessible name via aria-label, just not rendered on screen. For
  // dense contexts like a table row's action cluster.
  triggerIcon?: string
  dialogContentClassName?: string
  title: string
  description?: string
  children: React.ReactNode
}

// Bottom sheet below md, centered dialog at md+ — without a JS viewport
// check. Two independent triggers exist in the DOM at all times, one
// `md:hidden` and one `hidden md:inline-flex`; CSS decides which is visible
// at first paint, so only ONE is ever clickable on a given viewport. Its
// counterpart's `open` state can therefore never become true, so its
// Content never mounts — no double overlay, no flash, no media-query hook.
export function ResponsiveDialog({
  mobileOpen,
  onMobileOpenChange,
  desktopOpen,
  onDesktopOpenChange,
  triggerLabel,
  triggerVariant,
  triggerClassName,
  triggerIcon,
  dialogContentClassName,
  title,
  description,
  children,
}: ResponsiveDialogProps) {
  const triggerContent = triggerIcon ? (
    <>
      <Icon name={triggerIcon} size={16} />
      <span className="sr-only">{triggerLabel}</span>
    </>
  ) : (
    triggerLabel
  )

  const desktopTrigger = (
    <DialogTrigger
      render={
        <Button
          variant={triggerVariant}
          size={triggerIcon ? "icon-sm" : "default"}
          aria-label={triggerIcon ? triggerLabel : undefined}
          className={cn("hidden rounded-full md:inline-flex", triggerClassName)}
        />
      }
    >
      {triggerContent}
    </DialogTrigger>
  )

  return (
    <>
      <Drawer open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <DrawerTrigger
          render={
            <Button
              variant={triggerVariant}
              size={triggerIcon ? "icon-sm" : "default"}
              aria-label={triggerIcon ? triggerLabel : undefined}
              className={cn("rounded-full md:hidden", triggerClassName)}
            />
          }
        >
          {triggerContent}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={desktopOpen} onOpenChange={onDesktopOpenChange}>
        {triggerIcon ? <Tooltip content={triggerLabel}>{desktopTrigger}</Tooltip> : desktopTrigger}
        <DialogContent className={dialogContentClassName}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    </>
  )
}
