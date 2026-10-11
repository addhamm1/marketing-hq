import type { z } from "zod";

/** Result of a server action. Errors are message keys, translated in the UI. */
export type ActionFailure = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
  params?: Record<string, string | number>;
};

export type ActionResult<T = undefined> = { ok: true; data: T } | ActionFailure;

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string>,
  params?: Record<string, string | number>,
): ActionFailure {
  return { ok: false, error, fieldErrors, params };
}

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: z.ZodError) {
  return fail("validation.invalid", fieldErrorsFrom(error));
}

/** Map a Postgres error from an RPC to a message key. */
export function dbError(error: { code?: string; message?: string } | null): string {
  if (!error) return "common.unknownError";
  if (error.code === "42501") return "common.notAllowed";
  return "common.unknownError";
}

const STAGE_ERRORS = ["review_stage_locked", "transition_not_allowed", "missing_reviewer", "missing_approver", "stale_step"];

/** Content-cycle errors raised by move_card_stage / decide_step. */
export function stageError(error: { code?: string; message?: string } | null): ActionFailure {
  const msg = error?.message ?? "";
  if (msg.startsWith("missing_fields:")) {
    return fail("stageActions.errors.missing_fields", undefined, { fields: msg.slice("missing_fields:".length) });
  }
  const known = STAGE_ERRORS.find((k) => msg.includes(k));
  if (known) return fail(`stageActions.errors.${known}`);
  if (error?.code === "42501") return fail("stageActions.errors.not_allowed");
  return fail("common.unknownError");
}

/** Only allow same-site relative redirect targets. */
export function safeNext(next: unknown): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}
