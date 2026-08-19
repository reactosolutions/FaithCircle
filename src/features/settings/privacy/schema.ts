import { z } from "zod";
import { useTranslations } from "next-intl";

export const PHONE_VISIBILITIES = ["circle", "leaders"] as const;
export function usePhoneVisibilityLabel(): Record<(typeof PHONE_VISIBILITIES)[number], string> {
  const t = useTranslations("Settings");
  return {
    circle: t("phoneVisibilityCircle"),
    leaders: t("phoneVisibilityLeaders"),
  };
}

export const updatePrivacySchema = z.object({
  phoneVisibility: z.enum(PHONE_VISIBILITIES),
  hideAddressUntilRsvp: z.preprocess((value) => value === "on" || value === "true", z.boolean()),
});
