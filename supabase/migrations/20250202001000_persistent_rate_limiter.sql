-- rate limiter storage (Supabase-native)
create table if not exists public.rate_limit_hits (
  bucket text not null,
  ts timestamptz not null default now()
);
create index if not exists rate_limit_hits_bucket_ts_idx on public.rate_limit_hits(bucket, ts desc);

create or replace function public.gc_rate_limit_hits(retain_minutes int default 30)
returns void language plpgsql security definer as $$
begin
  delete from public.rate_limit_hits
  where ts < now() - (retain_minutes || ' minutes')::interval;
end$$;

create or replace function public.bump_hit(p_bucket text, window_seconds int)
returns int language plpgsql security definer as $$
declare cnt int;
begin
  insert into public.rate_limit_hits(bucket) values (p_bucket);
  select count(*) into cnt
  from public.rate_limit_hits
  where bucket = p_bucket
    and ts >= now() - make_interval(secs => window_seconds);
  return cnt;
end$$;

alter table public.rate_limit_hits enable row level security;
drop policy if exists "server-only-rl" on public.rate_limit_hits;
create policy "server-only-rl" on public.rate_limit_hits
for all using (false) with check (false);

