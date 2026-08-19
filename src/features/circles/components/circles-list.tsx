import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StaggerItem } from "@/components/ui/stagger-item";

interface CircleRow {
  id: string;
  name: string;
  invite_code: string | null;
  advisorNames: string[];
  memberCount: number;
}

export function CirclesList({
  circles,
  emptyAction,
}: {
  circles: CircleRow[];
  emptyAction?: React.ReactNode;
}) {
  const t = useTranslations("Circles");

  if (circles.length === 0) {
    return (
      <Card>
        <EmptyState icon="group_work" title={t("emptyCirclesTitle")} action={emptyAction} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {circles.map((circle, index) => (
        <StaggerItem key={circle.id} index={index}>
          <Link
            href={`/circles/${circle.id}`}
            className="block transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md"
          >
            <Card>
              <CardContent className="flex flex-col gap-2 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-heading text-base font-semibold text-foreground">{circle.name}</h3>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon name="group" size={16} />
                    {t("membersCount", { count: circle.memberCount })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {circle.advisorNames.length > 0 ? circle.advisorNames.join(", ") : t("noAdvisorAssigned")}
                </p>
                {circle.invite_code && (
                  <p className="font-mono text-xs text-muted-foreground">
                    {t("joinCode", { code: circle.invite_code })}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        </StaggerItem>
      ))}
    </div>
  );
}
