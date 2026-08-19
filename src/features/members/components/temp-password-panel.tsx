"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";

// No email system relied on for onboarding or password resets — this is
// the shared "here's the temp password, go share it" panel both
// InviteDialog and ResetPasswordDialog show after generating one.
export function TempPasswordPanel({
  email,
  tempPassword,
  onDone,
}: {
  email: string;
  tempPassword: string;
  onDone: () => void;
}) {
  const t = useTranslations("Members");
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <IconCircle tone="success" size="xl">
        <Icon name="check" size={28} />
      </IconCircle>
      <div>
        <h3 className="font-heading text-base font-semibold text-foreground">
          {t("accountCreatedTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("shareTempPasswordHint", { email })}</p>
      </div>
      <div className="flex w-full flex-col gap-1.5 text-start">
        <Label htmlFor="tempPassword">{t("tempPasswordLabel")}</Label>
        <div className="flex gap-2">
          <Input id="tempPassword" readOnly value={tempPassword} className="flex-1 font-mono" />
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={async () => {
              await navigator.clipboard.writeText(tempPassword);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            <Icon name={copied ? "check" : "content_copy"} size={16} />
            {copied ? t("copiedButton") : t("copyButton")}
          </Button>
        </div>
      </div>
      <Button type="button" className="w-full rounded-full" onClick={onDone}>
        {t("doneButton")}
      </Button>
    </div>
  );
}
