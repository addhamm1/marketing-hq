import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BirthdayForm } from "./birthday-form";

/** The "My birthday" card on the account page. Loads its own row. */
export async function BirthdayCard() {
  const access = await requireAccess();
  const t = await getTranslations("launch.birthday");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("birth_month, birth_day, celebrate")
    .eq("id", access.user_id)
    .single();
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
      <CardContent>
        <BirthdayForm defaults={{ birth_month: data?.birth_month ?? null, birth_day: data?.birth_day ?? null, celebrate: data?.celebrate ?? true }} />
      </CardContent>
    </Card>
  );
}
