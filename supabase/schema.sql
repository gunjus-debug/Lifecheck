-- Supabase schema for LifeCheck Dead Man's Switch / Welfare Check-in

create type plan_type as enum ('legacy', 'elder_care');
create type contact_role as enum ('human_verifier', 'beneficiary', 'primary_caregiver', 'emergency_contact');
create type schedule_frequency as enum ('daily', 'weekly', 'monthly', 'quarterly');
create type check_in_event_type as enum (
  'check_in_sent',
  'check_in_confirmed',
  'reminder_sent',
  'voice_call_made',
  'verifier_alerted',
  'vault_released',
  'emergency_alerted',
  'pause_set'
);
create type check_in_status as enum (
  'pending',
  'sent',
  'confirmed',
  'escalated',
  'released',
  'paused',
  'expired'
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text,
  full_name text not null,
  timezone text not null default 'UTC',
  plan_type plan_type not null default 'legacy',
  emergency_status jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table check_in_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  frequency schedule_frequency not null default 'monthly',
  interval integer not null default 1,
  last_check_in_at timestamptz,
  next_check_in_at timestamptz not null,
  grace_period_minutes integer not null default 90,
  paused_until timestamptz,
  vacation_reason text,
  active boolean not null default true,
  escalation_step integer not null default 0,
  current_status check_in_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_check_in_schedules_next_due
  on check_in_schedules (next_check_in_at)
  where active = true;

create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  relationship text,
  role contact_role not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contacts_user_role on contacts(user_id, role);

create table vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  label text not null,
  encrypted_payload text not null,
  encryption_metadata jsonb not null,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table check_in_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  schedule_id uuid not null references check_in_schedules(id) on delete cascade,
  event_type check_in_event_type not null,
  event_status text not null,
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  response_payload jsonb,
  escalation_step integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_check_in_logs_schedule on check_in_logs(schedule_id);
create index idx_check_in_logs_user on check_in_logs(user_id);

create table vault_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  token text not null unique,
  purpose text not null,
  otp_code text,
  expires_at timestamptz not null,
  used boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_vault_access_tokens_user on vault_access_tokens(user_id);
