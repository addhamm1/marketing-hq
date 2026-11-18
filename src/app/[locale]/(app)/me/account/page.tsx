import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/states/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountForm } from "@/features/auth/account-form";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { BirthdayCard } from "@/features/launch/birthday-card";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default async function AccountPage() {
  const access = await requireAccess();
  const t = await getTranslations("account");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, phone, locale")
    .eq("id", access.user_id)
    .single();

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
        <BirthdayCard />
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
