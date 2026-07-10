-- Enable UUID generation (Supabase projects usually have this already)
create extension if not exists pgcrypto;

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  session_code text not null unique,
  status text not null default 'waiting'
    check (status in ('waiting', 'active', 'ended')),
  presenter_socket_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Fast lookups by session code (also enforced unique above)
create index if not exists idx_sessions_session_code on sessions (session_code);

-- Keep updated_at current on every row change
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sessions_updated_at on sessions;

create trigger trg_sessions_updated_at
before update on sessions
for each row
execute function set_updated_at();
