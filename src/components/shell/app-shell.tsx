import { MapPin } from "lucide-react";
import { getLocale } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { PeopleProvider } from "@/components/people-context";
import { fetchPeople } from "@/features/boards/queries";
import { Link } from "@/i18n/navigation";
import type { Access } from "@/lib/auth/access";
import { isGuestOnly } from "@/lib/auth/access";
import { navFor } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { BottomBar } from "./bottom-bar";
import { NotificationBell } from "./notification-bell";
import { PresencePicker, type Presence } from "./presence-picker";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

async function branchName(access: Access, locale: string) {
  if (!access.home_branch_id) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("branches")
    .select("name_en, name_ar")
    .eq("id", access.home_branch_id)
    .maybeSingle();
  if (!data) return null;
  return locale === "ar" ? data.name_ar : data.name_en;
}

export async function AppShell({
  access,
  area,
  children,
  avatar,
}: {
  access: Access;
  area: "team" | "portal";
  children: ReactNode;
  avatar?: ReactNode;
}) {
  const locale = await getLocale();
  const items = navFor(access, area);
  const people = await fetchPeople(await createClient()).catch(() => []);
  const branch = area === "team" && access.is_team_app ? await branchName(access, locale) : null;
  const inTeam = area === "team" && access.is_team_app;
  const switchTo =
    inTeam && access.is_portal
      ? ({ href: "/portal", label: "portal" } as const)
      : !inTeam && access.is_team_app
        ? ({ href: "/map", label: "teamApp" } as const)
        : null;

  return (
    <PeopleProvider people={people}>
    <div className="flex min-h-dvh">
      <Sidebar
        items={items}
        header={
          <Link href="/">
            <Logo />
          </Link>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur sm:px-5">
          <Link href="/" className="md:hidden">
            <Logo />
          </Link>
          {branch ? (
            <span className="text-muted-foreground hidden items-center gap-1.5 text-sm sm:flex">
              <MapPin className="size-4" aria-hidden />
              {branch}
            </span>
          ) : null}
          <div className="ms-auto flex items-center gap-1">
            {inTeam && !isGuestOnly(access) ? <PresencePicker value={access.presence as Presence} /> : null}
            <NotificationBell userId={access.user_id} teamApp={access.is_team_app} />
            <Suspense>
              <LanguageSwitcher />
            </Suspense>
            <UserMenu
              name={access.display_name || access.full_name}
              email={access.email}
              showCharacter={inTeam && !isGuestOnly(access)}
              switchTo={switchTo}
              avatar={avatar}
            />
          </div>
        </header>
        <main id="content" className="flex-1 px-4 pt-5 pb-24 sm:px-6 md:pb-10 lg:px-8">
          {children}
        </main>
      </div>
      <BottomBar items={items} />
    </div>
    </PeopleProvider>
  );
}
