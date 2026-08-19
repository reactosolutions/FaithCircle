import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface Candidate {
  id: string;
  fullName: string | null;
  lastHostedAt: string | null;
}

export function HostRotationHint({ candidates }: { candidates: Candidate[] }) {
  const t = useTranslations("Settings");
  if (candidates.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noHostsAvailableYet")}</p>;
  }

  return (
    <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {candidates.map((candidate, index) => (
        <li key={candidate.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
          <span className={index === 0 ? "font-medium text-foreground" : "text-muted-foreground"}>
            {index === 0 && t("suggestedPrefix")}
            {candidate.fullName ?? t("unnamed")}
          </span>
          <span className="text-xs text-muted-foreground">
            {candidate.lastHostedAt
              ? t("lastHostedLabel", { date: format(new Date(candidate.lastHostedAt), "MMM d, yyyy") })
              : t("neverHostedLabel")}
          </span>
        </li>
      ))}
    </ol>
  );
}
