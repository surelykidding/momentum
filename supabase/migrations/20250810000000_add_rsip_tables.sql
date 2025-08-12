-- RSIP tables
create table if not exists public.rsip_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.rsip_nodes(id) on delete cascade,
  title text not null,
  rule text not null,
  sort_order integer not null default 0,
  use_timer boolean not null default false,
  timer_minutes integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_rsip_nodes_user on public.rsip_nodes(user_id);

create table if not exists public.rsip_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_added_at timestamptz,
  allow_multiple_per_day boolean not null default false
);


