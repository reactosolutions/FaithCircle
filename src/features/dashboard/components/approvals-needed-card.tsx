import Link from "next/link";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/icon-circle";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import type { getPendingApprovals } from "../queries";

type Approval = Awaited<ReturnType<typeof getPendingApprovals>>[number];

// Read-only preview of what's sitting in the approval queues — Members
// (status=pending signups) and Settings > Organization (org-wide join
// requests) stay the one place each is actually acted on (per the earlier
// decision to consolidate signup approval there instead of a separate
// dashboard widget); this just makes sure "something needs a look" is
// visible without having to remember to check either page. Always renders
// (even with nothing pending) rather than disappearing — CLAUDE.md's own
// rule against a page silently showing nothing, and the more concrete
// reason: an admin staring at a dashboard with no visual confirmation this
// section exists can't tell "nothing pending" apart from "broken."
export function ApprovalsNeededCard({ approvals }: { approvals: Approval[] }) {
  const t = useTranslations("Dashboard");

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <IconCircle tone="warning" size="md">
            <Icon name="how_to_reg" size={20} filled />
          </IconCircle>
          <CardTitle className="text-base">{t("approvalsNeededTitle")}</CardTitle>
        </div>
      </CardHeader>
      {approvals.length === 0 ? (
        <CardContent>
          <EmptyState icon="how_to_reg" title={t("approvalsNoneRightNow")} />
        </CardContent>
      ) : (
        <>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {approvals.map((approval) => (
              <Link
                key={`${approval.kind}-${approval.id}`}
                href={approval.kind === "signup" ? "/members?status=pending" : "/settings/organization"}
                className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 hover:bg-muted/50"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {approval.fullName || approval.email || t("approvalsUnnamed")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(approval.at), { addSuffix: true })}
                  </span>
                </div>
                <Badge variant="outline">
                  {approval.kind === "signup" ? t("approvalsSignupBadge") : t("approvalsJoinRequestBadge")}
                </Badge>
              </Link>
            ))}
          </CardContent>
          <CardFooter className="justify-end border-t-0 bg-transparent">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              render={<Link href="/members?status=pending" />}
            >
              {t("approvalsViewAll")}
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
