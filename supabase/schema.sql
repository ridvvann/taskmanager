-- Run this once in Supabase: SQL Editor > New query > paste > Run

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  cat text not null default 'Work' check (cat in ('Work','Productivity','Personal')),
  due_date date,
  due_time time,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  size text not null default '',
  role smallint not null default 0 check (role between 0 and 2),   -- 0 Designed, 1 Marketed, 2 Both
  price numeric(12,2) not null default 0,
  qty int not null default 1 check (qty >= 1),
  items jsonb not null default '[]'::jsonb,  -- products: name, type fixed|dim, price, qty, w, h, unit
  invoice_no text,  -- company invoice number, for tracing
  deadline date,
  status smallint not null default 0 check (status between 0 and 3), -- 0 Just got it, 1 Designing, 2 Waiting confirmation, 3 Done
  created_at timestamptz not null default now()
);

create index on public.tasks (user_id);
create index on public.projects (user_id);

-- Each person only ever sees their own rows
alter table public.tasks enable row level security;
alter table public.projects enable row level security;

create policy "own tasks" on public.tasks for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own projects" on public.projects for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Live sync between devices
alter publication supabase_realtime add table public.tasks, public.projects;
