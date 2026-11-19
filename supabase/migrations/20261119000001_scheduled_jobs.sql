-- W-19 Scheduled jobs run inside the database (Supabase Cron), so the app can be
-- hosted anywhere, including shared hosting where cron jobs run every 15 minutes at most.
-- * SQL jobs (meetings, reminders, gates, check-out) call their cron_* functions directly.
-- * Jobs that need app code (email, phone notifications, digest) call the app over HTTPS
--   with the cron secret. The URL and secret live in Supabase Vault, set per environment
--   by supabase/production-cron.sql. Without them, _cron_call_app does nothing.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create function public._cron_call_app(p_path text) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  base text := (select decrypted_secret from vault.decrypted_secrets where name = 'marketing_hq_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'marketing_hq_cron_secret');
begin
  if base is null or secret is null or p_path !~ '^/api/cron/[a-z-]+$' then
    return null;
  end if;
  return net.http_get(
    url := rtrim(base, '/') || p_path,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 55000);
end $$;

revoke execute on function public._cron_call_app(text) from authenticated;
revoke execute on all functions in schema public from public, anon;
