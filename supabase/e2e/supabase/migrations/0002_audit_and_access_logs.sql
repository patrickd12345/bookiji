-- audit_log and access_log

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid,
  actor_id uuid,
  action text not null,
  reason text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_booking on audit_log(booking_id);

create table if not exists access_log (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,  -- whose data was accessed
  actor_id uuid not null,    -- who accessed
  purpose text not null,
  resource text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_access_subject on access_log(subject_id);
