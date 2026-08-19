import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const t = await getTranslations("Auth");
  const ERROR_MESSAGE: Record<string, string> = {
    oauth: t("errorOauth"),
    cancelled: t("errorCancelled"),
    account_exists: t("errorAccountExists"),
  };
  const message = params.error ? ERROR_MESSAGE[params.error] : undefined;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{t("welcomeBackTitle")}</CardTitle>
        <CardDescription>{t("signInSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {message && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
        <SignInForm />
      </CardContent>
    </Card>
  );
}
