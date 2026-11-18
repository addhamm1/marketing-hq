"use client";

import { useTranslations } from "next-intl";
import { Controller } from "react-hook-form";
import { FormField } from "@/components/form/form-field";
import { SubmitButton } from "@/components/form/submit-button";
import { useActionForm } from "@/components/form/use-action-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BranchLocationFields } from "./branch-location-fields";
import { updateBranch } from "./org-actions";
import { branchSchema, CHECKIN_METHODS, type BranchInput, type BranchOutput } from "./schemas";

const METHODS = CHECKIN_METHODS;

export type BranchRow = {
  id: string;
  name_en: string;
  name_ar: string;
  area: string;
  map_key: string;
  public_ips: string[];
  checkin_methods: ("gps" | "wifi" | "qr" | "field" | "home" | "manual")[];
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number;
  location_confirmed_at: string | null;
};

export function BranchFormDialog({ branch, onClose }: { branch: BranchRow; onClose: () => void }) {
  const t = useTranslations("admin");
  const tm = useTranslations("checkinMethod");
  const tc = useTranslations("common");
  const { form, onSubmit, pending } = useActionForm<BranchInput, undefined, BranchOutput>({
    schema: branchSchema,
    action: updateBranch,
    defaultValues: {
      ...branch,
      // Retired or HR-only methods are not editable here.
      checkin_methods: branch.checkin_methods.filter((m): m is (typeof METHODS)[number] => (METHODS as readonly string[]).includes(m)),
      public_ips: branch.public_ips.join("\n"),
      latitude: branch.latitude === null ? "" : String(branch.latitude),
      longitude: branch.longitude === null ? "" : String(branch.longitude),
      geofence_radius_m: String(branch.geofence_radius_m),
    },
    successMessage: t("branchSaved"),
    onSuccess: onClose,
  });
  const { errors } = form.formState;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{branch.name_en}</DialogTitle>
        </DialogHeader>
        <form id="branch-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="name_en" label={t("nameEn")} error={errors.name_en?.message}>
            <Input id="name_en" dir="ltr" {...form.register("name_en")} />
          </FormField>
          <FormField id="name_ar" label={t("nameAr")} error={errors.name_ar?.message}>
            <Input id="name_ar" dir="rtl" {...form.register("name_ar")} />
          </FormField>
          <FormField id="area" label={t("area")} error={errors.area?.message}>
            <Input id="area" {...form.register("area")} />
          </FormField>
          <FormField id="map_key" label={t("mapKey")} error={errors.map_key?.message}>
            <Input id="map_key" dir="ltr" {...form.register("map_key")} />
          </FormField>
          <FormField
            id="public_ips"
            label={t("publicIps")}
            description={t("publicIpsHint")}
            error={errors.public_ips?.message}
            className="sm:col-span-2"
          >
            <Textarea id="public_ips" dir="ltr" rows={3} {...form.register("public_ips")} />
          </FormField>
          <BranchLocationFields form={form} />
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">{t("checkinMethods")}</legend>
            <Controller
              control={form.control}
              name="checkin_methods"
              render={({ field }) => (
                <div className="flex flex-wrap gap-4">
                  {METHODS.map((m) => (
                    <Label key={m} className="flex items-center gap-2 font-normal">
                      <Checkbox
                        checked={field.value.includes(m)}
                        onCheckedChange={(c) => field.onChange(c ? [...field.value, m] : field.value.filter((x) => x !== m))}
                      />
                      {tm(m)}
                    </Label>
                  ))}
                </div>
              )}
            />
          </fieldset>
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <Label className="flex items-center gap-2 font-normal sm:col-span-2">
                <Switch checked={field.value} onCheckedChange={field.onChange} />
                {t("active")}
              </Label>
            )}
          />
        </form>
        <DialogFooter>
          <SubmitButton pending={pending} form="branch-form">
            {tc("save")}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
