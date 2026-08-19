import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/charts/count-up";

export function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <CardContent className="flex flex-col gap-1 p-4">
      <span className="font-heading text-2xl font-semibold text-foreground">
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="min-h-11 transition-colors hover:bg-muted/50">{content}</Card>
      </Link>
    );
  }

  return <Card>{content}</Card>;
}
