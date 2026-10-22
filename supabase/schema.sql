-- Righto Booked database. Run in the Supabase SQL editor (Sydney region project).

create extension if not exists pgcrypto;

-- One row per tradie client.
create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text not null check (trade in ('aircon', 'plumbing', 'electrical')),
  owner_first_name text not null,
  owner_mobile text not null,          -- E.164, e.g. +61412345678
  twilio_number text not null unique,  -- the number calls are forwarded to
  retell_agent_id text,
  review_link text,
  booking_link text,
  timezone text not null default 'Australia/Adelaide',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  first_name text,
  mobile text not null,
  suburb text,
  address text,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  opted_out_at timestamptz,            -- set when they reply STOP
  created_at timestamptz not null default now(),
  unique (business_id, mobile)
);

create type job_status as enum ('new', 'booked', 'callback', 'quoted', 'won', 'lost', 'done');

create table jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  summary text not null,
  urgent boolean not null default false,
  status job_status not null default 'new',
  booked_for timestamptz,
  quoted_at timestamptz,
  done_at timestamptz,
  external_ref text,                   -- ServiceM8 / Fergus / simPRO job id (phase 4)
  created_at timestamptz not null default now()
);

create table calls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  retell_call_id text unique,
  from_number text not null,
  duration_seconds int,
  summary text,
  recording_url text,
  outcome text not null check (outcome in ('handled', 'missed', 'transferred', 'fallback')),
  created_at timestamptz not null default now()
);

-- Every text in or out, for the record and for debugging.
create table messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  direction text not null check (direction in ('in', 'out')),
  to_number text not null,
  from_number text not null,
  body text not null,
  kind text not null,                  -- template key, or 'inbound'
  twilio_sid text,
  created_at timestamptz not null default now()
);

-- Texts to send later: quote follow-ups, review requests, reminders.
create table scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  job_id uuid references jobs(id) on delete cascade,
  template text not null,
  send_at timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create index scheduled_due on scheduled_messages (send_at) where sent_at is null and cancelled_at is null;
create index jobs_by_business on jobs (business_id, created_at desc);
create index calls_by_business on calls (business_id, created_at desc);

-- Delete call recordings links after 90 days (privacy). Schedule with pg_cron:
-- select cron.schedule('purge-recordings', '0 3 * * *',
--   $$update calls set recording_url = null where created_at < now() - interval '90 days'$$);

-- Lock everything down; the app uses the service role key on the server only.
-- Per-tradie logins with row level security policies come in phase 2.
alter table businesses enable row level security;
alter table customers enable row level security;
alter table jobs enable row level security;
alter table calls enable row level security;
alter table messages enable row level security;
alter table scheduled_messages enable row level security;
