import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { validateInviteToken } from "@/features/settings/organization/join-actions";
import { JoinRequestForm } from "./join-request-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import logo from "@/images/logo.png";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("Auth");
  const valid = await validateInviteToken(token);

  if (!valid) {
    notFound();
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Image src={logo} alt="" className="size-16 rounded-full object-cover" />
        <span className="font-heading text-2xl font-semibold text-primary">Faith Circle</span>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t("requestToJoinTitle")}</CardTitle>
          <CardDescription>{t("requestToJoinSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <JoinRequestForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
