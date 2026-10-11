import { ShieldQuestion } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/features/auth/actions";

export default async function NoAccessPage() {
  const t = await getTranslations("auth");
  return (
    <Card>
      <CardHeader>
        <ShieldQuestion className="text-muted-foreground mb-2 size-8" aria-hidden />
        <CardTitle className="text-xl">
          <h1>{t("noAccessTitle")}</h1>
        </CardTitle>
        <CardDescription>{t("noAccessBody")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signOut}>
          <Button variant="outline" type="submit" className="w-full">
            {t("signOut")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
