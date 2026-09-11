-- Kavir Dash high scores.
-- Reference only — this is not run automatically by any pipeline. Paste it
-- into the Supabase project's SQL editor once, by hand, to create the
-- table the game's leaderboard reads and writes via the anon key.

create table if not exists public.high_scores (
  id uuid primary key default gen_random_uuid(),
  username text not null check (char_length(username) between 1 and 20),
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index if not exists high_scores_score_idx on public.high_scores (score desc);

alter table public.high_scores enable row level security;

-- The anon key is embedded in the deployed page (standard for a
-- client-only leaderboard), so anyone can read or add a row — there's no
-- server component to gate writes further than this.
create policy "Public read" on public.high_scores
  for select using (true);

create policy "Public insert" on public.high_scores
  for insert with check (true);
