create table if not exists public.archive_data (
  id text primary key,
  kind text not null check (kind in ('books', 'authors')),
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.archive_data enable row level security;

drop policy if exists "public can read archive" on public.archive_data;
drop policy if exists "public can write archive" on public.archive_data;

create policy "public can read archive"
  on public.archive_data for select
  using (true);

create policy "public can write archive"
  on public.archive_data for all
  using (true)
  with check (true);

insert into public.archive_data (id, kind, data)
values
  ('books', 'books', '[]'::jsonb),
  ('authors', 'authors', '[]'::jsonb)
on conflict (id) do nothing;
