import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { homePath } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";

export default async function Home() {
  const access = await requireAccess();
  const locale = await getLocale();
  return redirect({ href: homePath(access), locale });
}
