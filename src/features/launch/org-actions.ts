"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbError, fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { hasRole } from "@/lib/auth/access";
import { actionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { branchAddSchema, brandSchema, departmentSchema, requestTypeAddSchema, roomSchema, slugify, teamAddSchema } from "./schemas";

async function superAdmin() {
  const access = await actionAccess();
  return access && hasRole(access, "super_admin") ? access : null;
}

/** Tries a readable key, then the same key with a short suffix if it is taken. */
async function withUniqueKey(base: string, insert: (key: string) => PromiseLike<{ error: { code?: string; message?: string } | null }>) {
  const first = await insert(base);
  if (first.error?.code !== "23505") return first.error;
  return (await insert(`${base}-${crypto.randomUUID().slice(0, 4)}`)).error;
}

export async function saveDepartment(input: unknown): Promise<ActionResult> {
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const { id, name_en, name_ar } = parsed.data;
  const supabase = await createClient();
  const error = id
    ? (await supabase.from("departments").update({ name_en, name_ar }).eq("id", id)).error
    : await withUniqueKey(slugify(name_en) || "department", (slug) => supabase.from("departments").insert({ name_en, name_ar, slug }));
  if (error) return fail(dbError(error));
  revalidatePath("/[locale]/admin/organisation", "page");
  return ok();
}

export async function addTeam(input: unknown): Promise<ActionResult> {
  const parsed = teamAddSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const supabase = await createClient();
  const error = await withUniqueKey(slugify(parsed.data.name_en) || "team", (slug) => supabase.from("teams").insert({ ...parsed.data, slug }));
  if (error) return fail(dbError(error));
  revalidatePath("/[locale]/admin/organisation", "page");
  return ok();
}

export async function saveBrand(input: unknown): Promise<ActionResult> {
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const { id, name, color } = parsed.data;
  const supabase = await createClient();
  const error = id
    ? (await supabase.from("brands").update({ name, color }).eq("id", id)).error
    : await withUniqueKey(slugify(name) || "brand", (slug) => supabase.from("brands").insert({ name, color, slug }));
  if (error) return fail(dbError(error));
  revalidatePath("/[locale]/admin/organisation", "page");
  return ok();
}

/** A new branch starts with no coordinates: its point is set and confirmed in the branch editor. */
export async function addBranch(input: unknown): Promise<ActionResult> {
  const parsed = branchAddSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const supabase = await createClient();
  const error = await withUniqueKey(slugify(parsed.data.name_en) || "branch", (slug) =>
    supabase.from("branches").insert({ ...parsed.data, slug, map_key: "hq" }),
  );
  if (error) return fail(dbError(error));
  revalidatePath("/[locale]/admin/branches", "page");
  return ok();
}

/** Confirms that a branch's saved point is right, without having to move it. */
export async function confirmBranchLocation(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .update({ location_confirmed_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .not("latitude", "is", null)
    .select("id");
  if (error) return fail(dbError(error));
  if (!data.length) return fail("launch.branches.noPoint");
  revalidatePath("/[locale]/admin/branches", "page");
  return ok();
}

export async function saveRoom(input: unknown): Promise<ActionResult> {
  const parsed = roomSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await superAdmin())) return fail("common.notAllowed");
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = id ? await supabase.from("meeting_rooms").update(row).eq("id", id) : await supabase.from("meeting_rooms").insert(row);
  if (error) return fail(dbError(error));
  revalidatePath("/[locale]/admin/rooms", "page");
  return ok();
}

const dateField = (name: string, en: string, ar: string, required: boolean) => ({ name, type: "date", required, label_en: en, label_ar: ar });

/** A new type starts switched off, so its approval chain can be reviewed before anyone uses it. */
export async function addRequestType(input: unknown): Promise<ActionResult> {
  const parsed = requestTypeAddSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access || !hasRole(access, "super_admin", "hr")) return fail("common.notAllowed");
  const { name_en, name_ar, category, counts_working_days } = parsed.data;
  if (category !== "leave" && !hasRole(access, "super_admin")) return fail("common.notAllowed");
  const isLeave = category === "leave";
  const supabase = await createClient();
  const error = await withUniqueKey((slugify(name_en) || "request").replaceAll("-", "_"), (key) =>
    supabase.from("request_types").insert({
      key: key.replaceAll("-", "_"),
      name_en,
      name_ar,
      category,
      is_leave: isLeave,
      counts_working_days,
      is_active: false,
      approval_chain: isLeave ? [{ resolve: "team_lead_of_requester" }, { resolve: "role:hr" }] : [{ resolve: "team_lead_of_requester" }],
      form_schema: {
        fields: [
          dateField("starts_on", "First day", "أول يوم", true),
          dateField("ends_on", "Last day", "آخر يوم", true),
          { name: "note", type: "textarea", required: false, label_en: "Note", label_ar: "ملاحظة" },
        ],
      },
    }),
  );
  if (error) return fail(dbError(error));
  revalidatePath("/[locale]/admin/request-types", "page");
  return ok();
}
