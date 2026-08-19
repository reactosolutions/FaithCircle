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

export function CircleSelect({
  circles,
  value,
}: {
  circles: { id: string; name: string }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Events");

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (!next) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("circleId", next);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger size="sm">
        <SelectValue>{circles.find((c) => c.id === value)?.name ?? t("selectCirclePlaceholder")}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {circles.map((circle) => (
          <SelectItem key={circle.id} value={circle.id}>
            {circle.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
