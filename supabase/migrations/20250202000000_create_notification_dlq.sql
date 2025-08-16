create table if not exists public.notification_dlq (
	id uuid primary key default gen_random_uuid(),
	payload jsonb not null,
	error text,
	status text not null default 'dead',
	created_at timestamptz not null default now()
);

create index if not exists notification_dlq_created_at_idx on public.notification_dlq(created_at desc);

comment on table public.notification_dlq is 'Persistent dead-letter queue for failed notifications';

