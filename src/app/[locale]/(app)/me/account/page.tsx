import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/features/auth/account-form";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { NotificationSettings } from "@/features/push/notification-settings";
import { isGuestOnly } from "@/lib/auth/access";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default async function AccountPage() {
  const access = await requireAccess();
  const t = await getTranslations("account");
  const tn = await getTranslations("pushSettings");
  const supabase = await createClient();
  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase.from("profiles").select("display_name, phone, locale").eq("id", access.user_id).single(),
    supabase.from("notification_preferences").select("digest_email").eq("user_id", access.user_id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("title")} description={<span dir="ltr">{access.email}</span>} />
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountForm
              defaults={{
                display_name: profile?.display_name ?? "",
                phone: profile?.phone ?? "",
                locale: (profile?.locale as "en" | "ar") ?? "en",
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tn("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationSettings
              vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null}
              digest={preferences?.digest_email ?? true}
              showDigest={!isGuestOnly(access)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("security")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
