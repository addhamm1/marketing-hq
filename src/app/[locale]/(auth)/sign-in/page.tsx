import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/features/auth/sign-in-form";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("signIn") };
}

export default async function SignInPage({ searchParams }: PageProps<"/[locale]/sign-in">) {
  const { next, reason } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>{t("signInTitle")}</h1>
        </CardTitle>
        <CardDescription>{t("signInSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reason === "inactive" ? (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {t("inactive")}
          </p>
        ) : null}
        <SignInForm next={typeof next === "string" ? next : undefined} />
        <p className="text-muted-foreground text-sm">{t("forgotPassword")}</p>
      </CardContent>
    </Card>
  );
}
