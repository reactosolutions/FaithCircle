"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CheckboxList } from "@/components/ui/checkbox-list";
import { updateCircleAdvisors } from "../actions";
import { notifyActionResult } from "@/lib/notify";

interface Candidate {
  id: string;
  full_name: string | null;
}

export function AdvisorsEditor({
  circleId,
  currentAdvisors,
  advisorCandidates,
}: {
  circleId: string;
  currentAdvisors: Candidate[];
  advisorCandidates: Candidate[];
}) {
  const t = useTranslations("Circles");
  const [advisorIds, setAdvisorIds] = useState<string[]>(currentAdvisors.map((a) => a.id));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dirty =
    advisorIds.length !== currentAdvisors.length ||
    !currentAdvisors.every((a) => advisorIds.includes(a.id));

  function toggle(id: string) {
    setAdvisorIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateCircleAdvisors({ circleId, advisorIds });
      if (!result.ok) setError(result.error);
      notifyActionResult(result, t("advisorsUpdatedToast"));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <CheckboxList
        options={advisorCandidates.map((c) => ({ id: c.id, label: c.full_name ?? t("unnamed") }))}
        selectedIds={advisorIds}
        onToggle={toggle}
        emptyLabel={t("noAdvisorsYet")}
        maxHeightClassName="max-h-48"
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {dirty && (
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={save}
          className="w-fit rounded-full"
        >
          {pending ? t("advisorsSaving") : t("advisorsSaveButton")}
        </Button>
      )}
    </div>
  );
}
