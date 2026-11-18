"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BulkAllowanceDialog } from "@/features/launch/bulk-allowance-dialog";
import { useMessage } from "@/hooks/use-message";
import { usePathname, useRouter } from "@/i18n/navigation";
import { setAllowance } from "./actions";

type Row = { user_id: string; type_id: string; allowance: number; used: number };

export function AllowancesEditor({ year, types, people, balances }: { year: number; types: { id: string; key: string; name: string }[]; people: { id: string; name: string }[]; balances: Row[] }) {
  const t = useTranslations("hr");
  const tc = useTranslations("common");
  const message = useMessage();
  const router = useRouter();
  const pathname = usePathname();
  const [typeId, setTypeId] = useState(types[0]?.id ?? "");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();
  const get = (userId: string) => balances.find((b) => b.user_id === userId && b.type_id === typeId);
  const years = [year - 1, year, year + 1];
  const selected = types.find((x) => x.id === typeId);

  function save(userId: string) {
    const value = Number(edits[userId]);
    if (Number.isNaN(value)) return;
    startTransition(async () => {
      const r = await setAllowance({ user_id: userId, type_id: typeId, year, allowance: value });
      if (r.ok) toast.success(tc("saved"));
      else toast.error(message(r.error));
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t("allowances")}</h2>
      <div className="flex flex-wrap items-end gap-2">
        <Select value={String(year)} onValueChange={(v) => router.replace(`${pathname}?year=${v}`)}>
          <SelectTrigger className="w-28" aria-label={t("year")}><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={typeId} onValueChange={setTypeId}>
          <SelectTrigger className="w-44" aria-label={t("type")}><SelectValue /></SelectTrigger>
          <SelectContent>{types.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="ms-auto">
          <BulkAllowanceDialog typeId={typeId} typeKey={selected?.key ?? ""} typeName={selected?.name ?? ""} year={year} />
        </div>
      </div>
      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="text-muted-foreground border-b text-xs">
            <tr>
              <th className="px-4 py-2 text-start font-medium">{t("person")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("allowance")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("used")}</th>
              <th className="px-4 py-2 text-start font-medium">{t("remaining")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {people.map((p) => {
              const b = get(p.id);
              const value = edits[p.id] ?? String(b?.allowance ?? 0);
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">
                    <Input type="number" min={0} max={365} className="h-8 w-20" value={value} aria-label={`${t("allowance")} ${p.name}`}
                      onChange={(e) => setEdits((s) => ({ ...s, [p.id]: e.target.value }))}
                      onBlur={() => edits[p.id] !== undefined && Number(edits[p.id]) !== (b?.allowance ?? 0) && save(p.id)} />
                  </td>
                  <td className="px-4 py-2 tabular-nums">{b?.used ?? 0}</td>
                  <td className="px-4 py-2 tabular-nums">{(b?.allowance ?? 0) - (b?.used ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
