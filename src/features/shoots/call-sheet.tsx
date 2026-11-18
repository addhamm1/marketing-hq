import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { formatShootDate, shootMapLink, shortTime } from "./helpers";
import type { ShootPage } from "./queries";

// Print: only the sheet, on white A4, with rows that never split across pages.
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 14mm; }
  html, body { background: #fff !important; }
  aside, body header, nav, [data-sonner-toaster] { display: none !important; }
  main#content { padding: 0 !important; }
  .call-sheet { font-size: 11px; color: #000; }
  .call-sheet table { width: 100%; }
  .call-sheet tr, .call-sheet li { break-inside: avoid; }
  .call-sheet h2 { break-after: avoid; }
}`;

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="border-b pb-1 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const th = "py-1.5 pe-3 text-start font-medium";
const td = "py-1.5 pe-3 align-top";

export async function CallSheet({ data, names }: { data: ShootPage; names: Record<string, string> }) {
  const t = await getTranslations("shoots");
  const locale = await getLocale();
  const { shoot, crew, shots, equipment, cards } = data;
  const branch = shoot.branches;
  const place = shoot.location_name ?? (locale === "ar" ? branch?.name_ar : branch?.name_en) ?? "";
  const map = shootMapLink(shoot.location_url, branch);
  const name = (id: string | null) => (id ? (names[id] ?? "") : "");
  return (
    <article className="call-sheet bg-card mx-auto max-w-3xl space-y-5 rounded-xl border p-4 sm:p-6 print:max-w-none print:rounded-none print:border-0 print:p-0">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs">{t("callSheet")} · {t(`status.${shoot.status}`)}</p>
        <h1 className="text-xl font-semibold break-words">{shoot.title}</h1>
        <p className="text-sm font-medium">{formatShootDate(shoot.shoot_on, locale)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 print:grid-cols-4">
        <div><dt className="text-muted-foreground text-xs">{t("fields.callTime")}</dt><dd className="font-semibold" dir="ltr">{shortTime(shoot.call_time)}</dd></div>
        <div><dt className="text-muted-foreground text-xs">{t("fields.wrapTime")}</dt><dd className="font-semibold" dir="ltr">{shortTime(shoot.wrap_time) || "—"}</dd></div>
        <div><dt className="text-muted-foreground text-xs">{t("fields.producer")}</dt><dd className="font-semibold break-words">{name(shoot.producer_id) || t("noProducer")}</dd></div>
        <div className="min-w-0">
          <dt className="text-muted-foreground text-xs">{t("fields.place")}</dt>
          <dd className="font-semibold break-words">{place}</dd>
          {map ? <dd className="text-xs break-all" dir="ltr"><a href={map} target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">{map}</a></dd> : null}
        </div>
      </dl>
      {shoot.brief ? <Block title={t("fields.brief")}><p className="text-sm break-words whitespace-pre-wrap">{shoot.brief}</p></Block> : null}

      <Block title={t("tabs.crew")}>
        {crew.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs"><tr><th className={th}>{t("crew.person")}</th><th className={th}>{t("crew.role")}</th><th className={th}>{t("crew.callTime")}</th><th className={th}>{t("crew.confirmed")}</th></tr></thead>
              <tbody className="divide-y">
                {crew.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>{c.user_id ? name(c.user_id) : c.external_name}</td>
                    <td className={td}>{c.role || "—"}</td>
                    <td className={td} dir="ltr">{shortTime(c.call_time) || shortTime(shoot.call_time)}</td>
                    <td className={td}>{c.confirmed ? t("crew.yes") : t("crew.no")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-muted-foreground text-sm">{t("crew.empty")}</p>}
      </Block>

      <Block title={t("tabs.shots")}>
        {shots.length ? (
          <ol className="divide-y text-sm">
            {shots.map((s, i) => (
              <li key={s.id} className="flex gap-2 py-1.5">
                <span aria-hidden className="mt-0.5 inline-block size-3.5 shrink-0 rounded-sm border text-center text-[10px] leading-3">{s.done ? "✓" : ""}</span>
                <div className="min-w-0">
                  <p className="break-words"><span className="tabular-nums">{i + 1}.</span> {s.description}{s.shot_type ? ` · ${s.shot_type}` : ""}{s.done ? ` · ${t("shots.done")}` : ""}</p>
                  {s.notes ? <p className="text-muted-foreground text-xs break-words">{s.notes}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : <p className="text-muted-foreground text-sm">{t("shots.empty")}</p>}
      </Block>

      <Block title={t("tabs.equipment")}>
        {equipment.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs"><tr><th className={th}>{t("equipment.item")}</th><th className={th}>{t("equipment.quantity")}</th><th className={th}>{t("equipment.owner")}</th><th className={th}>{t("equipment.packed")}</th></tr></thead>
              <tbody className="divide-y">
                {equipment.map((e) => (
                  <tr key={e.id}>
                    <td className={td}>{e.item}</td>
                    <td className={td}>{e.quantity}</td>
                    <td className={td}>{name(e.owner_id) || "—"}</td>
                    <td className={td}>{e.packed ? t("crew.yes") : t("crew.no")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-muted-foreground text-sm">{t("equipment.empty")}</p>}
      </Block>

      {cards.length ? <Block title={t("tabs.cards")}><ul className="list-inside list-disc text-sm">{cards.map((c) => <li key={c.id} className="break-words">{c.title}</li>)}</ul></Block> : null}
      {shoot.backup_plan ? <Block title={t("fields.backupPlan")}><p className="text-sm break-words whitespace-pre-wrap">{shoot.backup_plan}</p></Block> : null}
    </article>
  );
}
