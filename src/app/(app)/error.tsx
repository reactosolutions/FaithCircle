"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <IconCircle tone="destructive">
        <Icon name="cloud_off" size={24} />
      </IconCircle>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Couldn&apos;t load this page.</p>
        <p className="text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
      </div>
      <Button onClick={reset} size="sm">
        Try again
      </Button>
    </div>
  );
}
