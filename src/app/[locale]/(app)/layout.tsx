import { AppShell } from "@/components/shell/app-shell";
import { requireAccess } from "@/lib/auth/session";

export default async function TeamLayout({ children }: LayoutProps<"/[locale]">) {
  const access = await requireAccess();
  return (
    <AppShell access={access} area="team">
      {children}
    </AppShell>
  );
}
