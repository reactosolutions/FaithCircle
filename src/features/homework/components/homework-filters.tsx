"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

export function HomeworkFilters({ circles }: { circles: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Homework");
  const current = searchParams.get("circleId") ?? ALL;

  return (
    <Select
      value={current}
      onValueChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        if (next && next !== ALL) params.set("circleId", next);
        else params.delete("circleId");
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger size="sm" className="w-full sm:w-48">
        <SelectValue>
          {current === ALL ? t("allCircles") : circles.find((c) => c.id === current)?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t("allCircles")}</SelectItem>
        {circles.map((circle) => (
          <SelectItem key={circle.id} value={circle.id}>
            {circle.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
