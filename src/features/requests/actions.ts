"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions";
import { actionAccess } from "@/lib/auth/session";
import { flushEmailQueue } from "@/lib/email/queue";
import { createClient } from "@/lib/supabase/server";

const submitSchema = z.object({
  type_key: z.string().regex(/^[a-z_]+$/).max(60),
  data: z.record(z.string(), z.union([z.string().max(5000), z.number(), z.array(z.string().max(500)).max(10)])),
});

function requestError(message: string | undefined) {
  const m = message ?? "";
  if (m.startsWith("insufficient_balance:")) return fail("requests.errors.insufficient_balance", undefined, { days: m.split(":")[1] ?? "0" });
  if (m.startsWith("missing_fields:")) return fail("stageActions.errors.missing_fields", undefined, { fields: m.slice(15) });
  for (const k of ["invalid_dates", "no_working_days", "crosses_year", "invalid_files"]) if (m.includes(k)) return fail(`requests.errors.${k}`);
  return fail("common.unknownError");
}

export async function submitRequest(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_request", { type_key: parsed.data.type_key, data: parsed.data.data });
  if (error || !data) return requestError(error?.message);
  after(() => flushEmailQueue());
  revalidatePath("/[locale]/requests", "page");
  return ok({ id: data });
}

export async function cancelRequest(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_request", { p_request_id: parsed.data.id });
  if (error) return fail("common.notAllowed");
  after(() => flushEmailQueue());
  revalidatePath("/[locale]/requests", "page");
  return ok();
}

/** Signed upload into request-files/requests/<me>/ (sick notes). */
export async function createRequestFileUpload(input: unknown): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = z.object({ file_name: z.string().min(1).max(200) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const access = await actionAccess();
  if (!access) return fail("common.notAllowed");
  const ext = parsed.data.file_name.includes(".") ? parsed.data.file_name.slice(parsed.data.file_name.lastIndexOf(".")).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 8) : "";
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("request-files").createSignedUploadUrl(`requests/${access.user_id}/${randomUUID()}${ext}`);
  return error || !data ? fail("card.uploadFailed") : ok({ path: data.path, token: data.token });
}

export async function requestFileUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = z.object({ path: z.string().startsWith("requests/").max(300) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await actionAccess())) return fail("common.notAllowed");
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("request-files").createSignedUrl(parsed.data.path, 600);
  return error || !data ? fail("common.notAllowed") : ok({ url: data.signedUrl });
}
