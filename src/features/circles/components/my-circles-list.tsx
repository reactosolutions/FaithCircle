import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { StaggerItem } from "@/components/ui/stagger-item";

interface MyCircleRow {
  id: string;
  name: string;
  isAdvisor: boolean;
  isMember: boolean;
}

// The student/administrative "my circles" view — read-only, scoped to just
// the circles this viewer belongs to (listCirclesForProfile), as opposed to
// CirclesList's org-wide management view (admin only: create, see every
// circle, member counts). Reuses Members' own advisor/member badge wording
// since it's the exact same concept the member-detail page's "Circles"
// section already shows.
export function MyCirclesList({ circles }: { circles: MyCircleRow[] }) {
  const t = useTranslations("Circles");
  const tMembers = useTranslations("Members");

  if (circles.length === 0) {
    return (
      <Card>
        <EmptyState icon="group_work" title={t("notInAnyCircleYet")} />
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
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <span className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
                  <Icon name="group_work" size={20} className="text-muted-foreground" />
                  {circle.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {circle.isAdvisor && circle.isMember
                    ? tMembers("advisorAndMember")
                    : circle.isAdvisor
                      ? tMembers("advisorOnly")
                      : tMembers("memberOnly")}
                </span>
              </CardContent>
            </Card>
          </Link>
        </StaggerItem>
      ))}
    </div>
  );
}
