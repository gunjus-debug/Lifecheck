-- Supabase Row Level Security policies for LifeCheck

-- 1) Enable RLS on user-owned tables
alter table users enable row level security;
alter table check_in_schedules enable row level security;
alter table contacts enable row level security;
alter table vault_items enable row level security;
alter table check_in_logs enable row level security;
alter table vault_access_tokens enable row level security;

-- 2) Allow authenticated users to access their own profile
create policy "Users can access own profile" on users
  for select using (auth.uid() = id);

-- 3) Allow users to manage their own schedules
create policy "Users can select own schedules" on check_in_schedules
  for select using (auth.uid() = user_id);
create policy "Users can insert own schedules" on check_in_schedules
  for insert with check (auth.uid() = user_id);
create policy "Users can update own schedules" on check_in_schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) Allow users to access their own contacts
create policy "Users can access own contacts" on contacts
  for select using (auth.uid() = user_id);
create policy "Contacts managed by owner" on contacts
  for insert with check (auth.uid() = user_id);

-- 5) Allow users to access their own vault items
create policy "Users can access own vault items" on vault_items
  for select using (auth.uid() = user_id);
create policy "Users can insert own vault items" on vault_items
  for insert with check (auth.uid() = user_id);
create policy "Users can update own vault items" on vault_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6) Allow users to log their own check-in events
create policy "Users can log own events" on check_in_logs
  for insert with check (auth.uid() = user_id);
create policy "Users can read own logs" on check_in_logs
  for select using (auth.uid() = user_id);

-- 7) Allow vault access token validation by server only (service role) if using the admin API.
--    For client-side validation, create a specific policy if tokens are user-specific.
create policy "Server-only token access" on vault_access_tokens
  for select using (false);
