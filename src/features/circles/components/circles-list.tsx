"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StaggerItem } from "@/components/ui/stagger-item";
import { ViewToggle, type ViewMode } from "@/components/ui/view-toggle";

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
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  if (circles.length === 0) {
    return (
      <Card>
        <EmptyState icon="group_work" title={t("emptyCirclesTitle")} action={emptyAction} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden items-center justify-end md:flex">
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === "list" ? (
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>{t("nameLabel")}</TableHead>
              <TableHead>{t("advisorsTitle")}</TableHead>
              <TableHead>{t("membersTitle")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {circles.map((circle, index) => (
              <StaggerItem
                key={circle.id}
                index={index}
                as="tr"
                className="border-b border-border transition-colors hover:bg-muted/40"
              >
                <TableCell>
                  <Link href={`/circles/${circle.id}`} className="font-medium text-foreground">
                    {circle.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {circle.advisorNames.length > 0 ? circle.advisorNames.join(", ") : t("noAdvisorAssigned")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t("membersCount", { count: circle.memberCount })}
                </TableCell>
                <TableCell className="text-end">
                  <Link href={`/circles/${circle.id}`} className="inline-flex text-muted-foreground">
                    <Icon name="chevron_right" size={18} data-icon="inline-end" />
                  </Link>
                </TableCell>
              </StaggerItem>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="hidden grid-cols-1 gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
          {circles.map((circle, index) => (
            <StaggerItem key={circle.id} index={index}>
              <CircleCard circle={circle} />
            </StaggerItem>
          ))}
        </div>
      )}

      {/* Phone (<md): the card list, unaffected by the desktop toggle above. */}
      <div className="flex flex-col gap-3 md:hidden">
        {circles.map((circle, index) => (
          <StaggerItem key={circle.id} index={index}>
            <CircleCard circle={circle} />
          </StaggerItem>
        ))}
      </div>
    </div>
  );
}

function CircleCard({ circle }: { circle: CircleRow }) {
  const t = useTranslations("Circles");
  return (
    <Link
      href={`/circles/${circle.id}`}
      className="block h-full transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-2 py-4">
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
  );
}
