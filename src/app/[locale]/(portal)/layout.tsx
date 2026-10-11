import { AppShell } from "@/components/shell/app-shell";
import { requireAccess } from "@/lib/auth/session";

export default async function PortalLayout({ children }: LayoutProps<"/[locale]">) {
  const access = await requireAccess();
  return (
    <AppShell access={access} area="portal">
      {children}
    </AppShell>
  );
}
