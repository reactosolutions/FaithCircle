"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";

// Wraps sonner rather than building a toast primitive from scratch — but
// every visual and icon choice is ours: sonner's own icon set is swapped
// for Material Symbols via the Icon component (nothing in this app renders
// an icon outside that component), and colors/radius/shadow come from the
// same design tokens every card in the app uses, not sonner's defaults.
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      duration={5000}
      gap={8}
      icons={{
        success: (
          <IconCircle tone="success" size="sm">
            <Icon name="check_circle" size={16} filled />
          </IconCircle>
        ),
        error: (
          <IconCircle tone="destructive" size="sm">
            <Icon name="error" size={16} filled />
          </IconCircle>
        ),
        warning: (
          <IconCircle tone="accent" size="sm">
            <Icon name="warning" size={16} filled />
          </IconCircle>
        ),
        info: (
          <IconCircle tone="info" size="sm">
            <Icon name="info" size={16} filled />
          </IconCircle>
        ),
        loading: <Icon name="progress_activity" size={16} className="animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group flex w-full items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm text-card-foreground shadow-lg sm:w-[380px]",
          title: "font-medium leading-tight",
          description: "text-muted-foreground",
          actionButton:
            "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground",
          cancelButton:
            "rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground",
          closeButton:
            "border-border bg-card text-muted-foreground hover:text-foreground",
        },
      }}
      {...props}
    />
  );
}
