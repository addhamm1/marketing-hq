"use client";

import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type FieldValues = { place: string; card_id: string | null; note: string };

/** Field / shooting day: optional place name, card and note. The location is captured on submit. */
export function FieldForm({ cards, pending, onSubmit }: {
  cards: { id: string; title: string }[];
  pending: boolean;
  onSubmit: (v: FieldValues) => void;
}) {
  const t = useTranslations("checkin");
  const tc = useTranslations("common");
  const [place, setPlace] = useState("");
  const [cardId, setCardId] = useState("none");
  const [note, setNote] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ place: place.trim(), card_id: cardId === "none" ? null : cardId, note: note.trim() });
      }}
    >
      <p className="text-muted-foreground text-sm">{t("fieldHint")}</p>
      <div className="space-y-2">
        <Label htmlFor="checkin-place">{t("fieldPlace")}</Label>
        <Input id="checkin-place" maxLength={120} placeholder={t("fieldPlacePlaceholder")} value={place} onChange={(e) => setPlace(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="checkin-card">{t("fieldCard")}</Label>
        <Select value={cardId} onValueChange={setCardId}>
          <SelectTrigger id="checkin-card" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{tc("none")}</SelectItem>
            {cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="checkin-note">{t("fieldNote")}</Label>
        <Textarea id="checkin-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
        <LogIn aria-hidden /> {t("fieldSubmit")}
      </Button>
    </form>
  );
}
