-- =====================================================================
-- Multi-Exam Prep Platform — core schema (v1)
-- Postgres / Supabase. `exam` is a first-class dimension from day one.
--
-- Run this ONLY against the NEW platform's Supabase project.
-- Never run it against mcat-mastery / The 528 Academy.
--
-- Two decisions are encoded here:
--   1. Server-side question selection — the `questions` table has NO client
--      read policy, so correct answers + explanations never reach the browser.
--      Only the service role (server routes) can read them.
--   2. Resumable sessions — exam_sessions stores the full client state so a
--      refresh or a walk-away resumes exactly where the user left off.
-- =====================================================================


-- ---- exams ----------------------------------------------------------
create table exams (
  id          text primary key,          -- 'lsat', 'mcat', 'sat' ...
  name        text not null,             -- 'Law School Admission Test'
  short_name  text not null,             -- 'LSAT'
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);


-- ---- sections (exam-scoped content pools) --------------------------
-- Sections are CONTENT pools (LR, RC), not test-day section slots.
-- How a full timed test is assembled from these pools lives in the exam
-- config (exams.config.js -> simulation), not here.
create table sections (
  id          text primary key,          -- 'lsat_lr'  (EXAM-PREFIXED — never a bare code)
  exam_id     text not null references exams(id) on delete cascade,
  code        text not null,             -- 'lr'  (unprefixed, unique per exam)
  name        text not null,             -- 'Logical Reasoning'
  abbr        text not null,             -- 'LR'
  color       text,                      -- hex for dashboard chips
  sort_order  int not null default 0,
  unique (exam_id, code)
);


-- ---- questions (exam-scoped; answers live here and stay server-side) -
create table questions (
  id                    text primary key,   -- 'lsat_rc_001'  (EXAM-PREFIXED)
  exam_id               text not null references exams(id) on delete cascade,
  section_id            text not null references sections(id) on delete cascade,
  batch                 text,               -- 'L001' import batch id
  passage               text,               -- null for discretes; set on the group's first q
  use_prev_passage      boolean not null default false,  -- true on passage-set followers
  sort_order            int not null default 0,
  stem                  text not null,
  choices               jsonb not null,     -- [{"label":"A","text":"..."}, ...]
  correct_answer        text not null,      -- 'C'   <- gated: never sent pre-completion
  explanations          jsonb,              -- {"A":"...", ...}  <- gated too
  topic                 text,               -- for LSAT this doubles as question type
  difficulty            text check (difficulty in ('Easy','Medium','Hard')),
  content_category      text,               -- optional per-exam taxonomy code
  passage_image         text,               -- base64 data URI (optional)
  passage_image_caption text,
  created_at            timestamptz not null default now()
);

create index questions_exam_section_idx on questions (exam_id, section_id);
create index questions_batch_idx        on questions (exam_id, batch);


-- ---- exam_sessions (one active/finished attempt; fully resumable) ---
create table exam_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  exam_id        text not null references exams(id),
  section_id     text references sections(id),          -- null = mixed / multi-section
  mode           text not null,                          -- 'practice'|'timed'|'exam'|'reattempt'
  status         text not null default 'in_progress'
                   check (status in ('in_progress','completed','abandoned')),

  -- selection is frozen at start so resume AND grading are deterministic
  question_ids   jsonb not null,                         -- ordered ["lsat_rc_001", ...]

  -- resumable client state (autosaved during the session)
  answers        jsonb not null default '{}'::jsonb,     -- {"lsat_rc_001":"C"}
  flags          jsonb not null default '{}'::jsonb,
  strikes        jsonb not null default '{}'::jsonb,
  highlights     jsonb not null default '{}'::jsonb,     -- keyed by passage-holder id
  current_index  int  not null default 0,
  time_remaining int,                                    -- seconds; null = untimed

  -- results (written server-side on complete)
  raw_correct    int,
  raw_total      int,
  scaled_score   int,                                    -- null until a scale table exists

  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index exam_sessions_user_idx on exam_sessions (user_id, exam_id, status);


-- ---- question_attempts (source of truth for stats; written server-side)
create table question_attempts (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references exam_sessions(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  question_id        text not null references questions(id),
  selected_answer    text,
  is_correct         boolean not null,
  time_spent_seconds int,
  created_at         timestamptz not null default now()
);

create index question_attempts_user_q_idx
  on question_attempts (user_id, question_id, created_at desc);


-- =====================================================================
-- Row-Level Security
-- =====================================================================
alter table exams             enable row level security;
alter table sections          enable row level security;
alter table questions         enable row level security;
alter table exam_sessions     enable row level security;
alter table question_attempts enable row level security;

-- exams / sections: harmless structural metadata — any signed-in user may read.
create policy exams_read    on exams    for select to authenticated using (true);
create policy sections_read on sections for select to authenticated using (true);

-- questions: INTENTIONALLY no policy.
-- RLS is enabled with zero permissive policies => authenticated clients can
-- read NOTHING from this table. Only the service role (used exclusively in
-- server routes) bypasses RLS to select questions and grade. This is the moat:
-- correct_answer and explanations never sit in the browser.

-- exam_sessions: a user owns their sessions.
--   INSERT (start) + completion happen through server routes (service role).
--   The client may autosave its own IN-PROGRESS row directly (answers/flags/
--   strikes/highlights/current_index/time_remaining) for resume.
create policy sessions_select_own on exam_sessions
  for select to authenticated using (user_id = auth.uid());
create policy sessions_update_own on exam_sessions
  for update to authenticated
  using  (user_id = auth.uid() and status = 'in_progress')
  with check (user_id = auth.uid());

-- question_attempts: user reads own; INSERTs are server-side only so
-- is_correct can't be spoofed from the client.
create policy attempts_select_own on question_attempts
  for select to authenticated using (user_id = auth.uid());


-- =====================================================================
-- Seed: LSAT (Phase 1). Adding SAT/ACT/etc. later is just more rows here
-- plus a new entry in exams.config.js — no schema change.
-- =====================================================================
insert into exams (id, name, short_name, sort_order) values
  ('lsat', 'Law School Admission Test', 'LSAT', 1),
  ('pmp',  'Project Management Professional', 'PMP', 2);

insert into sections (id, exam_id, code, name, abbr, color, sort_order) values
  ('lsat_lr', 'lsat', 'lr', 'Logical Reasoning',     'LR', '#2b579a', 1),
  ('lsat_rc', 'lsat', 'rc', 'Reading Comprehension', 'RC', '#1a7f5c', 2),
  ('pmp_people',   'pmp', 'people',   'People',               'PE', '#7c3aed', 1),
  ('pmp_process',  'pmp', 'process',  'Process',              'PR', '#0e7490', 2),
  ('pmp_business', 'pmp', 'business', 'Business Environment', 'BE', '#b45309', 3);
