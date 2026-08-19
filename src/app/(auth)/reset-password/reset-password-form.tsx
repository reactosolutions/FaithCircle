"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/browser";
import { resetPasswordSchema } from "@/features/auth/schema";
import { PasswordInput } from "@/features/auth/components/password-input";
import { PasswordStrengthMeter } from "@/features/auth/components/password-strength-meter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Status = "checking" | "ready" | "invalid" | "success";

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The recovery token lives only in the URL fragment, which never reaches
  // the server — @supabase/ssr's browser client auto-processes it on init
  // and syncs the resulting session into cookies. There's no Server Action
  // equivalent for this step; it has to run client-side.
  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setStatus(data.session ? "ready" : "invalid");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("invalidPasswordMessage"));
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(t("couldNotUpdatePasswordMessage"));
      return;
    }

    setStatus("success");
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  if (status === "checking") {
    return <p className="text-sm text-muted-foreground">{t("checkingLinkMessage")}</p>;
  }

  if (status === "invalid") {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-sm text-destructive">
          {t("invalidLinkMessage")}
        </p>
        <Link href="/forgot-password" className="text-sm font-medium text-primary underline">
          {t("requestNewLinkText")}
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return <p className="text-sm text-success">{t("passwordUpdatedRedirect")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("newPasswordLabel")}</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <PasswordStrengthMeter password={password} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="rounded-full">
        {pending ? t("updatingButton") : t("updatePasswordButton")}
      </Button>
    </form>
  );
}
