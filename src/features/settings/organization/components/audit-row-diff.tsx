import { useTranslations } from "next-intl";

function displayValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AuditRowDiff({
  changedFields,
  oldData,
  newData,
}: {
  changedFields: string[] | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
}) {
  const t = useTranslations("Settings");
  const fields = changedFields ?? [];

  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noFieldDetail")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {fields.map((field) => {
        // A field can be in changed_fields but absent from both old/new
        // data — that means it was stripped by audit_exclusions. Show that
        // the change happened without exposing the value.
        const redacted = !(oldData && field in oldData) && !(newData && field in newData);
        return (
          <div key={field} className="grid grid-cols-3 gap-2 px-3 py-2 text-sm">
            <span className="font-medium text-foreground">{field}</span>
            {redacted ? (
              <span className="col-span-2 text-muted-foreground italic">{t("changedHidden")}</span>
            ) : (
              <>
                <span className="truncate text-muted-foreground line-through decoration-destructive/50">
                  {displayValue(oldData?.[field])}
                </span>
                <span className="truncate text-foreground">{displayValue(newData?.[field])}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
