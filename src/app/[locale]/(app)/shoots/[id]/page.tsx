import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/states/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchPeople } from "@/features/boards/queries";
import { CardsSection } from "@/features/shoots/cards-section";
import { CrewSection } from "@/features/shoots/crew-section";
import { EquipmentSection } from "@/features/shoots/equipment-section";
import { shortTime } from "@/features/shoots/helpers";
import { getBranchOptions, getShoot } from "@/features/shoots/queries";
import { ShootActions } from "@/features/shoots/shoot-actions";
import { ShootFacts } from "@/features/shoots/shoot-facts";
import { ShotsSection } from "@/features/shoots/shots-section";
import { ShootStatusBadge } from "@/features/shoots/status-badge";
import { Link } from "@/i18n/navigation";
import { requireAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("shoots");
  return { title: t("title") };
}

export default async function ShootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireAccess();
  const data = await getShoot(id, access);
  if (!data) notFound();
  const t = await getTranslations("shoots");
  const { shoot, crew, shots, equipment, cards, canEdit, canArchive } = data;
  const [branches, people] = await Promise.all([canEdit ? getBranchOptions() : [], fetchPeople(await createClient())]);
  const producer = people.find((p) => p.id === shoot.producer_id)?.display_name ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/shoots" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("title")}
      </Link>
      <PageHeader
        title={<span className="break-words">{shoot.title}</span>}
        description={<ShootStatusBadge status={shoot.status} />}
        actions={
          <ShootActions
            shootId={shoot.id}
            status={shoot.status}
            canEdit={canEdit}
            canArchive={canArchive}
            branches={branches}
            defaults={{
              title: shoot.title,
              shoot_on: shoot.shoot_on,
              call_time: shortTime(shoot.call_time),
              wrap_time: shortTime(shoot.wrap_time),
              place: shoot.branch_id ? "branch" : "outside",
              branch_id: shoot.branch_id,
              location_name: shoot.location_name ?? "",
              location_url: shoot.location_url ?? "",
              status: shoot.status,
              producer_id: shoot.producer_id,
              brief: shoot.brief,
              backup_plan: shoot.backup_plan,
            }}
          />
        }
      />
      <ShootFacts shoot={shoot} producer={producer} />
      <Tabs defaultValue="crew" className="gap-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="crew">{t("tabs.crew")} ({crew.length})</TabsTrigger>
          <TabsTrigger value="shots">{t("tabs.shots")} ({shots.length})</TabsTrigger>
          <TabsTrigger value="equipment">{t("tabs.equipment")} ({equipment.length})</TabsTrigger>
          <TabsTrigger value="cards">{t("tabs.cards")} ({cards.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="crew"><CrewSection shootId={shoot.id} crew={crew} canEdit={canEdit} shootCall={shortTime(shoot.call_time)} /></TabsContent>
        <TabsContent value="shots"><ShotsSection shootId={shoot.id} shots={shots} cards={cards} canEdit={canEdit} /></TabsContent>
        <TabsContent value="equipment"><EquipmentSection shootId={shoot.id} items={equipment} canEdit={canEdit} /></TabsContent>
        <TabsContent value="cards"><CardsSection shootId={shoot.id} cards={cards} canEdit={canEdit} /></TabsContent>
      </Tabs>
    </div>
  );
}
