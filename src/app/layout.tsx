import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Faith Circle",
  description: "A home for your faith community's circles, meetings, and homework.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  // Cheap, cache()-deduped lookup — theme is otherwise only resolved deep
  // inside (app)/layout.tsx, scoped to its own wrapper div rather than
  // <html>/<body> (see that file's comment on why). The Toaster below is
  // mounted once here so a single toast() call doesn't render twice; without
  // this it would never sit inside a `.dark` ancestor and would stay
  // light-styled even when the viewer's preference is dark.
  const user = await getCachedUser();
  let themeClass = "";
  if (user) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("theme")
      .eq("id", user.id)
      .single();
    themeClass = profile?.theme === "dark" ? "dark" : "";
  }

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${inter.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-dvh antialiased`}
    >
      <body className={`min-h-dvh flex flex-col ${themeClass}`}>
        {/* React 19 hoists a <link rel="stylesheet" precedence="..."> into
            <head> as a "resource" regardless of where in the tree it's
            rendered — but it still has to be valid HTML nesting at the JSX
            level first, so it goes here (inside <body>), not as a direct
            child of <html>. Material Symbols isn't a text font
            next/font/google optimizes the same way, so it's linked
            directly rather than loaded through next/font. Variable axes
            (FILL/wght/GRAD/opsz) are set per-icon via the Icon component,
            not here. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- that
            rule targets pages/_document.js (Pages Router); there's no
            equivalent restriction on the App Router root layout, which is
            the correct place for a stylesheet link next/font doesn't cover. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
          precedence="default"
        />
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
