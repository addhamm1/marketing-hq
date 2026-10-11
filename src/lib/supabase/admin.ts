import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses row policies: use only in server code for
 * cron jobs, check-in, and admin account tasks, after checking the caller.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(env.supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
