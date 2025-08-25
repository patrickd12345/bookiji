-- KB Feedback & Learning Infrastructure
-- This enables the KB to learn from user interactions and agent overrides

-- Feedback collection table
create table if not exists kb_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid,                          -- anonymous allowed; tie multiple events
  locale text check (locale in ('en','fr')) not null,
  query text not null,                      -- raw user query
  section_bias text check (section_bias in ('faq','vendor','policy','troubleshooting')),

  -- what was shown/chosen
  chosen_article_id uuid references kb_articles(id),
  chosen_chunk_id uuid references kb_article_chunks(id),

  -- user signal
  helpful boolean,                          -- thumbs up/down
  clicked boolean default false,            -- clicked a cited source
  dwell_ms integer,                         -- optional: time on answer

  -- human override (agent edit / better answer)
  override_text text,                       -- optional: agent's improved reply
  override_author text,                     -- optional: agent id/email (hashed is fine)

  -- request tracing
  request_id uuid,                          -- your X-Request-Id for correlation
  client text,                              -- e.g. 'chatgpt_action','web','cli'
  user_agent text
);

-- Indexes for performance
create index on kb_feedback (created_at);
create index on kb_feedback (helpful);
create index on kb_feedback (chosen_article_id);
create index on kb_feedback (locale);
create index on kb_feedback (section_bias);

-- Daily rollup view for dashboards
create or replace view kb_feedback_daily as
select
  date_trunc('day', created_at) as day,
  locale,
  section_bias,
  count(*) as events,
  avg(case when helpful is not null then (helpful::int) end) as helpful_rate,
  sum(clicked::int) as clicks,
  avg(dwell_ms) as avg_dwell_ms
from kb_feedback
group by 1,2,3
order by 1 desc;

-- Learning insights views
create or replace view kb_gaps as
select 
  query, 
  locale, 
  count(*) as n, 
  avg((helpful::int)) as helpful_rate,
  max(created_at) as last_seen
from kb_feedback
where created_at >= now() - interval '7 days'
group by 1,2
having count(*) >= 3 and avg((helpful::int)) < 0.4
order by helpful_rate asc, n desc;

create or replace view kb_articles_needing_love as
select 
  a.id,
  a.title,
  a.section,
  a.locale,
  count(f.*) as feedback_count,
  avg((f.helpful::int)) as helpful_rate
from kb_articles a
left join kb_feedback f on f.chosen_article_id = a.id
  and f.created_at >= now() - interval '14 days'
group by a.id, a.title, a.section, a.locale
having count(f.*) >= 5 and avg((f.helpful::int)) < 0.5
order by helpful_rate asc;

create or replace view kb_high_signal_overrides as
select 
  f.*,
  a.title as article_title,
  a.section as article_section
from kb_feedback f
left join kb_articles a on a.id = f.chosen_article_id
where f.override_text is not null
  and f.created_at >= now() - interval '30 days'
  and length(f.override_text) > 20  -- meaningful overrides only
order by f.created_at desc;

-- RLS policies for security
alter table kb_feedback enable row level security;

-- Allow public read access to feedback (for analytics)
create policy "Allow public read access to feedback" on kb_feedback
    for select using (true);

-- Only allow authenticated users to insert feedback
create policy "Allow authenticated users to insert feedback" on kb_feedback
    for insert with check (auth.role() = 'authenticated');

-- Grant necessary permissions
grant select on kb_feedback to anon, authenticated;
grant insert on kb_feedback to authenticated;
grant select on kb_feedback_daily to anon, authenticated;
grant select on kb_gaps to anon, authenticated;
grant select on kb_articles_needing_love to anon, authenticated;
grant select on kb_high_signal_overrides to anon, authenticated;
