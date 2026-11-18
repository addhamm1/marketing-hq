import { fail, type ActionFailure } from "@/lib/actions";

type DbError = { code?: string; message?: string } | null | undefined;

const RAISED = ["in_the_past", "title_required", "no_actions_board", "invalid_response"] as const;

/** Which form field a database error belongs beside. */
const FIELD: Record<string, string> = {
  room_taken: "room_id",
  in_the_past: "date",
  title_required: "title",
};

/** The message key for a database error from a meetings function. */
export function meetingErrorKey(error: DbError): string {
  // Exclusion constraint meetings_room_free: two meetings in one room at once.
  if (error?.code === "23P01") return "meetings.errors.room_taken";
  const message = error?.message ?? "";
  const raised = RAISED.find((key) => message.includes(key));
  if (raised) return `meetings.errors.${raised}`;
  if (error?.code === "42501") return "common.notAllowed";
  if (error?.code === "P0002") return "meetings.errors.not_found";
  return "common.unknownError";
}

/** A failed action, with the error placed beside its field when it has one. */
export function meetingFailure(error: DbError): ActionFailure {
  const key = meetingErrorKey(error);
  const field = FIELD[key.replace("meetings.errors.", "")];
  return fail(key, field ? { [field]: key } : undefined);
}
