-- Run once in the Supabase SQL Editor
alter table public.projects add column if not exists invoice_no text;
