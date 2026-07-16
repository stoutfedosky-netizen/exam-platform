# Multi-exam platform — core scaffold

The keystone layer for the parent platform: `exam` is a first-class dimension
from the first table, LSAT is the first exam expressed against it, and the two
decisions we settled on are baked in — **server-side question selection** (answers
never reach the browser) and **resumable sessions**.

File names are placeholders; rename freely. Nothing here touches mcat-mastery.

## Files

| File | What it is | Intended path in the new repo |
|---|---|---|
| `schema.sql` | Full Postgres/Supabase schema + RLS + LSAT seed | run in the new Supabase project |
| `exams.config.js` | Per-exam behavior/presentation (replaces the `SECTIONS` constant) | `src/config/exams.config.js` |
| `exam-server.js` | Server-only helpers (service-role client, auth, sanitize, selection) | `src/lib/server/exam-server.js` |
| `api/start.route.js` | Select questions server-side, create session, return sanitized set | `src/app/api/exam/start/route.js` |
| `api/session.route.js` | Resume: reload state + frozen questions | `src/app/api/exam/session/[id]/route.js` |
| `api/complete.route.js` | Grade server-side, write attempts, compute score | `src/app/api/exam/complete/route.js` |

## The two decisions, and how they're enforced

**Answers stay server-side.** The `questions` table has RLS enabled with *no*
client read policy, so an authenticated browser can read nothing from it. Only
the service role (used exclusively in the `api/*` routes) reads questions, and
every question leaves the server through `sanitizeQuestion()`, which drops
`correct_answer` and `explanations`. The client only ever sees answers *after*
`/api/exam/complete` grades the session and returns the answer key for review.

**Resume.** `exam_sessions` freezes the selected question ids at start and stores
full client state (`answers`, `flags`, `strikes`, `highlights`, `current_index`,
`time_remaining`). Mid-session autosave is a direct client write to the user's own
in-progress row (allowed by the `sessions_update_own` RLS policy) — no route
needed. Re-entry calls `GET /api/exam/session/[id]`, which returns the saved state
plus the frozen questions (answers still hidden until completion).

## Session lifecycle

1. `POST /api/exam/start` → server selects + freezes questions, creates the
   session, returns `{ sessionId, timeLimit, questions }` (sanitized).
2. During the session → client autosaves its own `exam_sessions` row (answers,
   flags, index, time). Refresh-safe.
3. `GET /api/exam/session/[id]` → resume (rehydrate state + questions).
4. `POST /api/exam/complete` → server grades, writes `question_attempts`, sets
   score, returns the answer key. Review screen renders from that.

## Adding the next exam (later)

No schema change. Add rows to `exams` + `sections`, add an entry to `EXAMS`, load
content. For a new question *type* (e.g. NCLEX bowtie) you'd add a `type` field to
questions + a renderer + a scoring branch — but LSAT needs none of that.

## Stubs to wire (marked in code with `throw`)

- `getUserId()` — connect to your Supabase server auth (`@supabase/ssr`).
- `selectWithPassageGroups()` — port `examData.selectQuestions` from mcat-mastery
  (group by batch + section, keep passage sets intact).
- `scale` in `exams.config.js` — LSAT 120–180 table. Null for now → raw % shows.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).

## Note

Assumes Next.js App Router + the `@/` path alias (jsconfig/tsconfig `paths`).
Plain JS to match mcat-mastery's conventions.
