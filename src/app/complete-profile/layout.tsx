import Image from "next/image";
import { getTranslations } from "next-intl/server";
import logo from "@/images/logo.png";

export default async function CompleteProfileLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("App");
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-background px-4 py-16">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Image src={logo} alt="" className="size-16 rounded-full object-cover" />
        <span className="font-heading text-2xl font-semibold text-primary">{t("name")}</span>
      </div>
      {children}
    </div>
  );
}
