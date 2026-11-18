import { createClient } from "@/lib/supabase/browser";
import type { Kudos } from "./types";

export const KUDOS_QUERY = ["kudos"] as const;

/** The newest kudos, as the signed-in user's row policies allow. */
export async function fetchKudos(limit: number): Promise<Kudos[]> {
  const { data, error } = await createClient()
    .from("kudos")
    .select("id, from_id, to_id, badge, message, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Kudos[];
}
