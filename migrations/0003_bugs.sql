create table if not exists bug_reports (
  id text primary key,
  user_id text not null,
  username text not null default '',
  title text not null,
  body text not null,
  path text,
  created_at timestamptz not null default now()
);
create index if not exists bug_reports_created_idx on bug_reports (created_at desc);
