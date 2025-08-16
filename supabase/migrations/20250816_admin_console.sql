-- 1) Extend profiles with role (admin/user)
alter table public.profiles add column if not exists role text default 'user';
alter table public.profiles alter column role set not null;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_valid_roles_chk'
  ) then
    alter table public.profiles
      add constraint profiles_valid_roles_chk check (role in ('user','admin'));
  end if;
end $$;

-- 2) Admin settings singleton
create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  rag_frequency_threshold int not null default 3,
  rag_auto_detect_enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists admin_settings_singleton_idx on public.admin_settings((true));

-- 3) RAG entries table
create table if not exists public.rag_entries (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid,
  summary text not null,
  solution text not null,
  approved_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
create index if not exists rag_entries_ticket_idx on public.rag_entries(ticket_id);

-- 4) Extend support_tickets with RAG flags
alter table public.support_tickets
  add column if not exists rag_suggested boolean default false,
  add column if not exists rag_flagged boolean default false;


