"use client";

import { ArrowLeftRight, KeyRound, LogOut, Smile, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { forgetThisDevice } from "@/features/push/forget-device";
import { Link } from "@/i18n/navigation";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

type Props = {
  name: string;
  email: string;
  showCharacter: boolean;
  switchTo: { href: string; label: "portal" | "teamApp" } | null;
  avatar?: React.ReactNode;
};

export function UserMenu({ name, email, showCharacter, switchTo, avatar }: Props) {
  const t = useTranslations("nav");
  const ta = useTranslations("auth");
  const ts = useTranslations("shell");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={ts("userMenu")}>
          {avatar ?? (
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(name)}</AvatarFallback>
            </Avatar>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate font-medium">{name}</div>
          <div className="text-muted-foreground truncate text-xs" dir="ltr">
            {email}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/me/account">
            <UserRound aria-hidden /> {t("account")}
          </Link>
        </DropdownMenuItem>
        {showCharacter ? (
          <DropdownMenuItem asChild>
            <Link href="/me/character">
              <Smile aria-hidden /> {t("character")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/change-password">
            <KeyRound aria-hidden /> {ta("changePassword")}
          </Link>
        </DropdownMenuItem>
        {switchTo ? (
          <DropdownMenuItem asChild>
            <Link href={switchTo.href}>
              <ArrowLeftRight aria-hidden /> {t(switchTo.label)}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <form action={async () => { await forgetThisDevice(); await signOut(); }}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut aria-hidden /> {ta("signOut")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
