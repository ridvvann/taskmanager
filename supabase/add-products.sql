-- Already ran schema.sql before? Run just this once in the Supabase SQL Editor.
alter table public.projects add column if not exists items jsonb not null default '[]'::jsonb;
