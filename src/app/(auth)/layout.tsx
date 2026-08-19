import Image from "next/image";
import { getLocale } from "next-intl/server";
import logo from "@/images/logo.png";
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher";
import type { Locale } from "@/i18n/request";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-center bg-background px-4 py-16">
      <div className="absolute end-4 top-4">
        <LanguageSwitcher locale={locale as Locale} />
      </div>
      <div className="mb-8 flex flex-col items-center gap-2">
        <Image src={logo} alt="" className="size-16 rounded-full object-cover" />
        <span className="font-heading text-2xl font-semibold text-primary">Faith Circle</span>
      </div>
      {children}
    </div>
  );
}
