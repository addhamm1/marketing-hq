"use client";

import { PackageCheck, PackagePlus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { usePeople, usePersonName } from "@/components/people-context";
import { EmptyState } from "@/components/states/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDefaultKit, addEquipment, removeEquipment, updateEquipment } from "./equipment-actions";
import type { ShootPage } from "./queries";
import { useShootAction } from "./use-shoot-action";

type Item = ShootPage["equipment"][number];

function EquipmentRow({ item, shootId, canEdit }: { item: Item; shootId: string; canEdit: boolean }) {
  const t = useTranslations("shoots.equipment");
  const tc = useTranslations("common");
  const { people } = usePeople();
  const name = usePersonName();
  const { pending, run } = useShootAction();
  const [quantity, setQuantity] = useState(String(item.quantity));
  const save = (patch: Partial<Pick<Item, "owner_id" | "packed" | "returned">> & { quantity?: string }) =>
    run(() => updateEquipment({ id: item.id, shoot_id: shootId, quantity, owner_id: item.owner_id, packed: item.packed, returned: item.returned, ...patch }));

  return (
    <li className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_5rem_minmax(0,11rem)_auto_auto_auto] sm:items-center">
      <span className="font-medium break-words">{item.item}</span>
      {canEdit ? (
        <>
          <Input type="number" min={1} max={999} dir="ltr" aria-label={`${t("quantity")}: ${item.item}`} value={quantity}
            onChange={(e) => setQuantity(e.target.value)} onBlur={() => quantity !== String(item.quantity) && save({ quantity })} />
          <Select value={item.owner_id ?? "none"} disabled={pending} onValueChange={(v) => save({ owner_id: v === "none" ? null : v })}>
            <SelectTrigger className="w-full" aria-label={`${t("owner")}: ${item.item}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("noOwner")}</SelectItem>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      ) : (
        <span className="text-muted-foreground text-sm sm:col-span-2">× {item.quantity} · {item.owner_id ? name(item.owner_id) : t("noOwner")}</span>
      )}
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={item.packed} disabled={!canEdit || pending} onCheckedChange={(c) => save({ packed: c === true })} /> {t("packed")}
      </Label>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={item.returned} disabled={!canEdit || pending} onCheckedChange={(c) => save({ returned: c === true })} /> {t("returned")}
      </Label>
      {canEdit ? (
        <Button variant="ghost" size="icon-sm" className="justify-self-end" disabled={pending} aria-label={`${tc("remove")}: ${item.item}`}
          onClick={() => run(() => removeEquipment({ id: item.id, shoot_id: shootId }))}><Trash2 aria-hidden /></Button>
      ) : null}
    </li>
  );
}

export function EquipmentSection({ shootId, items, canEdit }: { shootId: string; items: Item[]; canEdit: boolean }) {
  const t = useTranslations("shoots.equipment");
  const tc = useTranslations("common");
  const { pending, run } = useShootAction();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const packed = items.filter((i) => i.packed).length;
  const returned = items.filter((i) => i.returned).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <PackageCheck className="size-4" aria-hidden /> {t("progress", { packed, returned, total: items.length })}
        </p>
        {canEdit ? (
          <Button variant="outline" size="sm" disabled={pending}
            onClick={() => run(() => addDefaultKit({ shoot_id: shootId }), { success: t("kitAdded") })}>
            <PackagePlus aria-hidden /> {t("defaultKit")}
          </Button>
        ) : null}
      </div>
      {canEdit ? (
        <form
          className="bg-muted/40 grid grid-cols-[minmax(0,1fr)_5rem_auto] items-end gap-2 rounded-xl border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            run(() => addEquipment({ shoot_id: shootId, item: name, quantity }), { onDone: () => { setName(""); setQuantity("1"); } });
          }}
        >
          <div className="min-w-0 space-y-1">
            <Label htmlFor="equipment-item">{t("item")}</Label>
            <Input id="equipment-item" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="equipment-quantity">{t("quantity")}</Label>
            <Input id="equipment-quantity" type="number" min={1} max={999} dir="ltr" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <Button type="submit" disabled={pending || !name.trim()} aria-label={tc("add")}><Plus aria-hidden /><span className="max-sm:sr-only">{tc("add")}</span></Button>
        </form>
      ) : null}
      {items.length ? (
        <ul className="bg-card divide-y rounded-xl border">
          {items.map((i) => <EquipmentRow key={i.id} item={i} shootId={shootId} canEdit={canEdit} />)}
        </ul>
      ) : (
        <EmptyState title={t("empty")} body={canEdit ? t("emptyHint") : undefined} icon={<PackagePlus className="size-8" aria-hidden />} />
      )}
    </section>
  );
}
