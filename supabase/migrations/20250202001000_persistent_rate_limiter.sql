-- durable fixed window rate limiter
create table if not exists public.rate_limits (
  ip inet not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (ip, window_start)
);

-- Ensure required columns exist in case table was created earlier with a different shape
alter table if exists public.rate_limits 
  add column if not exists ip inet,
  add column if not exists window_start timestamptz,
  add column if not exists count int;

create index if not exists rate_limits_window_idx on public.rate_limits(window_start desc);

create or replace function public.bump_rate_limit(p_ip inet, p_window_seconds int, p_max int)
returns boolean
language plpgsql
security definer
as $$
declare w timestamptz := date_trunc('second', now()) - make_interval(secs => extract(epoch from now())::int % p_window_seconds);
declare c int;
begin
  insert into public.rate_limits(ip, window_start, count)
  values (p_ip, w, 1)
  on conflict (ip, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into c;

  return c <= p_max;
end; $$;

create or replace function public.gc_rate_limits(retain_windows int default 10, p_window_seconds int default 60)
returns void language plpgsql security definer as $$
begin
  delete from public.rate_limits
  where window_start < now() - make_interval(secs => retain_windows * p_window_seconds);
end$$;

alter table public.rate_limits enable row level security;
drop policy if exists "server-only-rl" on public.rate_limits;
create policy "server-only-rl" on public.rate_limits
for all using (false) with check (false);

