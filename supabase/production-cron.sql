-- Production schedule (Supabase Cron, UTC). Run once in the Supabase SQL editor after the
-- app is online, replacing the two values below. Safe to run again: it replaces the jobs.
-- The app URL is the public address; the secret must equal CRON_SECRET in the app's settings.

do $$
begin
  perform vault.create_secret('https://REPLACE-WITH-APP-URL', 'marketing_hq_url');
  perform vault.create_secret('REPLACE-WITH-CRON-SECRET', 'marketing_hq_cron_secret');
exception when unique_violation then
  raise notice 'Secrets already exist: update them in Vault (Project Settings > Vault) if they changed.';
end $$;

select cron.unschedule(jobname) from cron.job where jobname like 'hq-%';

-- Inside the database
select cron.schedule('hq-meetings', '*/5 * * * *', $$select public.cron_meetings()$$);
select cron.schedule('hq-post-reminders', '*/5 * * * *', $$select public.cron_post_reminders()$$);
select cron.schedule('hq-due-soon', '0 * * * *', $$select public.cron_due_soon()$$);
select cron.schedule('hq-auto-checkout', '5 * * * *', $$select public.cron_auto_checkout()$$);
select cron.schedule('hq-daily', '30 3 * * *', $$select public.cron_daily(); select public.cron_workflow_daily()$$);

-- Through the app (email, phone notifications, morning digest)
select cron.schedule('hq-push', '*/5 * * * *', $$select public._cron_call_app('/api/cron/push')$$);
select cron.schedule('hq-emails', '*/10 * * * *', $$select public._cron_call_app('/api/cron/emails')$$);
select cron.schedule('hq-digest', '0 3-7 * * *', $$select public._cron_call_app('/api/cron/digest')$$);

-- Keep the job history short.
select cron.schedule('hq-cron-cleanup', '0 2 * * *', $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);

select jobname, schedule from cron.job where jobname like 'hq-%' order by jobname;
