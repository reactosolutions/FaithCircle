"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

// A small icon button that copies `value` to the clipboard, flips to a
// checkmark for ~1.5s, and toasts. For links (map URLs, meeting links)
// shown next to a clickable <a>.
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  // Accessible label, e.g. "Copy map link".
  label?: string;
  className?: string;
}) {
  const t = useTranslations("Common");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t("copied"));
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label ?? t("copy")}
      onClick={copy}
      className={className}
    >
      <Icon name={copied ? "check" : "content_copy"} size={16} />
    </Button>
  );
}
