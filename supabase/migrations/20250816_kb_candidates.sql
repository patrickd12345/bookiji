create table if not exists public.kb_candidates (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id),
  question text not null,
  answer text not null,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz not null default now(),
  approved_at timestamptz null,
  rejected_at timestamptz null
);

create index if not exists kb_candidates_status_idx on public.kb_candidates(status);


