import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/features/auth/actions";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { requireAccess } from "@/lib/auth/session";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("changePassword") };
}

export default async function ChangePasswordPage() {
  const access = await requireAccess();
  const t = await getTranslations("auth");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>{t("changePasswordTitle")}</h1>
        </CardTitle>
        <CardDescription>
          {access.must_change_password ? t("changePasswordForced") : t("changePasswordSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm" dir="ltr">
          {access.email}
        </p>
        <ChangePasswordForm />
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit" className="w-full">
            {t("signOut")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
