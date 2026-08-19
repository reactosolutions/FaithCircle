import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { RequiredPasswordChangeForm } from "@/features/auth/components/required-password-change-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ChangePasswordPage() {
  const user = await getCachedUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Not gated behind must_change_password here — if they don't need to
  // change it (already cleared, or landed on this URL directly), just send
  // them on rather than showing a form with nothing to protect against
  // being submitted again.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", user.id)
    .single();
  if (!profile?.must_change_password) {
    redirect("/dashboard");
  }

  const t = await getTranslations("ChangePassword");

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <RequiredPasswordChangeForm />
      </CardContent>
    </Card>
  );
}
