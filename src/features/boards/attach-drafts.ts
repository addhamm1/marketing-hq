import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { cardPath, ownDraftName } from "@/lib/uploads/paths";

export type DraftFile = { path: string; name: string; mime: string | null; size: number };

/**
 * Moves the caller's staged drafts into cards/<card_id>/ and records them as
 * attachments. Runs as the caller: the storage update policy only allows moving
 * your own drafts into a card you can see. Returns how many files failed.
 */
export async function attachDrafts(supabase: SupabaseClient<Database>, userId: string, cardId: string, files: DraftFile[]) {
  let failed = 0;
  for (const f of files) {
    const name = ownDraftName(f.path, userId);
    if (!name) {
      failed += 1;
      continue;
    }
    const dest = cardPath(cardId, name);
    const moved = await supabase.storage.from("card-attachments").move(f.path, dest);
    if (moved.error) {
      failed += 1;
      continue;
    }
    const { error } = await supabase.from("attachments").insert({
      card_id: cardId, uploaded_by: userId, kind: "file", storage_path: dest, name: f.name, mime: f.mime, size: f.size,
    });
    if (error) failed += 1;
  }
  return failed;
}
