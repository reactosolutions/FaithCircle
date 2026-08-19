"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { detectMeetProvider, useMeetProviderLabel } from "../../format";

// Meeting link/notes — shown whenever the meeting has an online component
// (format !== "in_person").
export function MeetingLinkFields({
  meetUrl,
  onMeetUrlChange,
}: {
  meetUrl: string;
  onMeetUrlChange: (meetUrl: string) => void;
}) {
  const t = useTranslations("Events");
  const MEET_PROVIDER_LABEL = useMeetProviderLabel();
  const detectedProvider = meetUrl ? detectMeetProvider(meetUrl) : null;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="meetUrl">{t("meetingLinkLabel")}</Label>
        <Input
          id="meetUrl"
          name="meetUrl"
          type="url"
          placeholder={t("meetingLinkPlaceholder")}
          value={meetUrl}
          onChange={(event) => onMeetUrlChange(event.target.value)}
        />
        <input type="hidden" name="meetProvider" value={detectedProvider ?? ""} />
        {detectedProvider && (
          <span className="text-xs text-muted-foreground">
            {t("detectedProvider", { provider: MEET_PROVIDER_LABEL[detectedProvider] })}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="meetNotes">{t("joiningNotesLabel")}</Label>
        <Textarea id="meetNotes" name="meetNotes" rows={2} placeholder={t("joiningNotesPlaceholder")} />
      </div>
    </>
  );
}
