import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { IconCircle } from "@/components/ui/icon-circle";

// Shown in place of every page's content while a self-service /signup sits
// at status 'pending' — nav/header stay visible (there's nothing else to
// do but wait), only the main content area is replaced.
export async function PendingApprovalCard() {
  const t = await getTranslations("PendingApproval");

  return (
    <div className="flex justify-center pt-12">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <IconCircle tone="accent">
            <Icon name="schedule" size={24} />
          </IconCircle>
          <h2 className="font-heading text-lg font-semibold text-foreground">{t("title")}</h2>
          <p className="max-w-xs text-sm text-muted-foreground">{t("body")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
