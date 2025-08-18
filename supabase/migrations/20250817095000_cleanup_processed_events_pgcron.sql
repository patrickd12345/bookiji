-- 20250817_cleanup_processed_events_pgcron.sql
-- Enable pg_cron once (safe if already enabled)
create extension if not exists pg_cron;

-- Remove any prior job with the same name
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cleanup_payments_processed_events') then
    perform cron.unschedule((select jobid from cron.job where jobname = 'cleanup_payments_processed_events'));
  end if;
end
$$;

-- Nightly at 03:05 UTC: purge events older than 3 days
select cron.schedule(
  'cleanup_payments_processed_events',
  '5 3 * * *',
  $$delete from payments_processed_events where processed_at < now() - interval '3 days';$$
);


