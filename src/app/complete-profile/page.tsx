import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCachedUser } from "@/lib/supabase/server";
import { CompleteProfileForm } from "@/features/auth/components/complete-profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CompleteProfilePage() {
  const user = await getCachedUser();

  if (!user) {
    redirect("/sign-in");
  }

  const t = await getTranslations("CompleteProfile");
  // Signup's optional phone field lands in user_metadata, not profiles.phone
  // yet — this step is what actually persists it, so it's read from here to
  // prefill rather than leaving it blank for something they already typed.
  const initialPhone = typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : "";

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <CompleteProfileForm initialPhone={initialPhone} />
      </CardContent>
    </Card>
  );
}
