"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { setLocale } from "../actions";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/i18n/request";

const LOCALE_LABEL: Record<Locale, string> = { ar: "العربية", en: "English" };
const LOCALES: Locale[] = ["ar", "en"];

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [pending, startTransition] = useTransition();
  const t = useTranslations("Nav");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("changeLanguage")}
        disabled={pending}
        className="flex size-11 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground data-popup-open:bg-muted md:size-8"
      >
        <Icon name="translate" size={20} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {LOCALES.map((value) => (
          <DropdownMenuItem
            key={value}
            disabled={pending || value === locale}
            onClick={() => startTransition(() => setLocale(value))}
          >
            {LOCALE_LABEL[value]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
