"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { avatarConfigSchema, lookNameSchema, LOOK_SLOTS, manifestSchema, savedLooksSchema, validateAgainstManifest } from "@/game/avatar/config";
import { activeSeasonalItems, blockedSeasonalItems } from "@/game/avatar/seasonal";
import type { AvatarConfig, SavedLook } from "@/game/avatar/types";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { cairoDateString } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import manifestJson from "../../../public/sprites/manifest.json";

const manifest = manifestSchema.parse(manifestJson);

const saveLookSchema = z.object({
  slot: z.number().int().min(0).max(LOOK_SLOTS - 1),
  name: lookNameSchema,
  config: avatarConfigSchema,
});

/** Every selected id must exist on its layer. */
function hasUnknownItem(config: AvatarConfig): boolean {
  return manifest.layers.some((layer) => {
    const id = config[layer.key];
    return !!id && !layer.options.some((o) => o.id === id);
  });
}

async function activeItems(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Set<string> | null> {
  const { data, error } = await supabase.from("seasonal_events").select("key, name_en, name_ar, starts_on, ends_on, items, is_active");
  return error ? null : activeSeasonalItems(data ?? [], cairoDateString());
}

export async function saveAvatar(input: unknown): Promise<ActionResult> {
  const parsed = avatarConfigSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  if (hasUnknownItem(parsed.data)) return fail("character.errors.unknownItem");
  const supabase = await createClient();
  const [active, { data: current, error: readError }] = await Promise.all([
    activeItems(supabase),
    supabase.from("avatars").select("config").eq("user_id", access.user_id).maybeSingle(),
  ]);
  if (!active || readError) return fail("common.unknownError");
  const previous = (current?.config as unknown as AvatarConfig | undefined) ?? null;
  if (blockedSeasonalItems(parsed.data, previous, manifest, active).length) return fail("character.errors.outOfSeason");
  const config = validateAgainstManifest(parsed.data, manifest);
  const { error } = await supabase.from("avatars").upsert({ user_id: access.user_id, config: config as never });
  if (error) return fail("common.unknownError");
  if (!access.avatar_seen) await supabase.from("profiles").update({ avatar_seen: true }).eq("id", access.user_id);
  revalidatePath("/", "layout");
  return ok();
}

/** Save or overwrite one look slot. Returns the full list so the creator can refresh. */
export async function saveLook(input: unknown): Promise<ActionResult<SavedLook[]>> {
  const parsed = saveLookSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  if (hasUnknownItem(parsed.data.config)) return fail("character.errors.unknownItem");
  const supabase = await createClient();
  const [active, { data: row, error: readError }] = await Promise.all([
    activeItems(supabase),
    supabase.from("avatars").select("looks").eq("user_id", access.user_id).maybeSingle(),
  ]);
  if (!active || readError) return fail("common.unknownError");
  if (blockedSeasonalItems(parsed.data.config, null, manifest, active).length) return fail("character.errors.outOfSeason");

  const stored = savedLooksSchema.safeParse(row?.looks ?? []);
  const others = (stored.success ? stored.data : []).filter((l) => l.slot !== parsed.data.slot);
  const config = validateAgainstManifest(parsed.data.config, manifest);
  const looks = savedLooksSchema.safeParse([...others, { slot: parsed.data.slot, name: parsed.data.name, config }].sort((a, b) => a.slot - b.slot));
  if (!looks.success) return invalid(looks.error);

  // Someone with no character yet starts from the look they just saved.
  const { error } = row
    ? await supabase.from("avatars").update({ looks: looks.data as never }).eq("user_id", access.user_id)
    : await supabase.from("avatars").insert({ user_id: access.user_id, config: config as never, looks: looks.data as never });
  if (error) return fail("common.unknownError");
  return ok(looks.data as SavedLook[]);
}

export async function markAvatarSeen(): Promise<ActionResult> {
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const supabase = await createClient();
  await supabase.from("profiles").update({ avatar_seen: true }).eq("id", access.user_id);
  return ok();
}
