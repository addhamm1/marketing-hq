"use client";

import { Loader2, LocateFixed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { geolocate } from "@/features/checkin/geolocate";
import type { BranchInput, BranchOutput } from "./schemas";

/** Latitude, longitude and geofence radius, with "Use my current location". */
export function BranchLocationFields({ form }: { form: UseFormReturn<BranchInput, unknown, BranchOutput> }) {
  const t = useTranslations("admin");
  const [locating, setLocating] = useState(false);
  const { errors } = form.formState;

  async function useMine() {
    setLocating(true);
    const geo = await geolocate({ strict: false });
    setLocating(false);
    if (!geo.ok) {
      toast.error(t("locationFailed"));
      return;
    }
    form.setValue("latitude", geo.location.lat.toFixed(6), { shouldDirty: true, shouldValidate: true });
    form.setValue("longitude", geo.location.lng.toFixed(6), { shouldDirty: true, shouldValidate: true });
  }

  return (
    <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
      <legend className="mb-2 text-sm font-medium">{t("location")}</legend>
      <FormField id="latitude" label={t("latitude")} error={errors.latitude?.message}>
        <Input id="latitude" dir="ltr" inputMode="decimal" {...form.register("latitude")} />
      </FormField>
      <FormField id="longitude" label={t("longitude")} error={errors.longitude?.message}>
        <Input id="longitude" dir="ltr" inputMode="decimal" {...form.register("longitude")} />
      </FormField>
      <FormField id="geofence_radius_m" label={t("geofenceRadius")} error={errors.geofence_radius_m?.message}>
        <Input id="geofence_radius_m" dir="ltr" inputMode="numeric" {...form.register("geofence_radius_m")} />
      </FormField>
      <p className="text-muted-foreground text-xs sm:col-span-3">{t("geofenceHint")}</p>
      <Button type="button" variant="outline" className="sm:col-span-3 sm:justify-self-start" disabled={locating} onClick={useMine}>
        {locating ? <Loader2 className="animate-spin" aria-hidden /> : <LocateFixed aria-hidden />}
        {locating ? t("locatingBranch") : t("useMyLocation")}
      </Button>
    </fieldset>
  );
}
