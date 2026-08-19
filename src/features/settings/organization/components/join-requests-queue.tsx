"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { approveJoinRequest, rejectJoinRequest } from "../actions";
import { notifyActionResult } from "@/lib/notify";

interface Request {
  id: string;
  email: string;
  full_name: string | null;
  requested_at: string;
}

function RequestRow({ request }: { request: Request }) {
  const t = useTranslations("Settings");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) return null;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{request.full_name ?? request.email}</span>
        <span className="text-xs text-muted-foreground">
          {request.email} · {format(new Date(request.requested_at), "MMM d, yyyy")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await rejectJoinRequest(request.id);
              if (result.ok) setDone(true);
              else setError(result.error);
              notifyActionResult(result, t("requestRejectedToast"));
            })
          }
        >
          {t("rejectButton")}
        </Button>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await approveJoinRequest(request.id);
              if (result.ok) setDone(true);
              else setError(result.error);
              notifyActionResult(result, t("requestApprovedToast"));
            })
          }
        >
          {t("approveButton")}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive sm:basis-full">{error}</p>}
    </div>
  );
}

export function JoinRequestsQueue({ requests }: { requests: Request[] }) {
  const t = useTranslations("Settings");
  if (requests.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{t("noPendingRequests")}</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {requests.map((request) => (
        <RequestRow key={request.id} request={request} />
      ))}
    </div>
  );
}
