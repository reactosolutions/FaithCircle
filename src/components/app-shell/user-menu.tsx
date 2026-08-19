"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { signOut } from "@/features/auth/actions";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ name, roleLabel }: { name: string; roleLabel: string }) {
  const [pending, startTransition] = useTransition();
  const t = useTranslations("Nav");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-start outline-none hover:bg-muted data-popup-open:bg-muted md:min-h-8">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{name}</span>
          <span className="text-xs text-muted-foreground">{roleLabel}</span>
        </div>
        <Icon name="expand_more" size={16} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLinkItem render={<Link href="/settings/account" />}>
          <Icon name="settings" size={16} />
          {t("accountSettings")}
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/settings/privacy" />}>
          <Icon name="shield" size={16} />
          {t("privacy")}
        </DropdownMenuLinkItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => signOut())}
        >
          <Icon name="logout" size={16} />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
