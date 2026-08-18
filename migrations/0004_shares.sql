create table if not exists shares (
  id text primary key,
  user_id text not null,
  username text not null default '',
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists shares_created_idx on shares (created_at desc);
