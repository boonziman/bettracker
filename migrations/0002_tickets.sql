create table if not exists tickets (
  id text primary key,
  user_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists tickets_user_id_idx on tickets (user_id);
