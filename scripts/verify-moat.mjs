// Proves the answer moat against the LIVE Supabase project.
// Run AFTER filling .env.local and applying supabase/schema.sql:
//   node scripts/verify-moat.mjs
//
// Checks:
//   1. Schema + seed: service role sees the exams/sections seed rows.
//   2. RLS moat: the ANON key selecting * from `questions` gets ZERO rows
//      (or a permission error) — never question data.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// minimal .env.local parser (no dotenv dependency)
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('FAIL: fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local first.');
  process.exit(1);
}

let failed = false;
const ok = (msg) => console.log(`  PASS  ${msg}`);
const bad = (msg) => { failed = true; console.error(`  FAIL  ${msg}`); };

// ---- 1. schema + seed (service role bypasses RLS) --------------------
console.log('\n[1/2] Schema + LSAT seed (service role)');
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: exams, error: exErr } = await admin.from('exams').select('id, short_name');
if (exErr) bad(`exams table: ${exErr.message}`);
else if (exams.some((e) => e.id === 'lsat')) ok(`exams seeded: ${JSON.stringify(exams)}`);
else bad(`exams table exists but no 'lsat' row: ${JSON.stringify(exams)}`);

const { data: sections, error: secErr } = await admin.from('sections').select('id');
const expected = ['lsat_lr', 'lsat_rc'];
if (secErr) bad(`sections table: ${secErr.message}`);
else if (expected.every((id) => sections.some((s) => s.id === id))) ok(`sections seeded: ${sections.map((s) => s.id).join(', ')}`);
else bad(`sections missing seed rows, got: ${JSON.stringify(sections)}`);

for (const table of ['questions', 'exam_sessions', 'question_attempts']) {
  const { error } = await admin.from(table).select('*', { head: true, count: 'exact' });
  if (error) bad(`${table} table: ${error.message}`);
  else ok(`${table} table exists`);
}

// ---- 2. the moat: anon key must read NOTHING from questions ----------
console.log('\n[2/2] Answer moat (anon key vs `questions`)');
const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: qRows, error: qErr } = await anon.from('questions').select('*');
if (qErr) ok(`anon select on questions rejected: ${qErr.message}`);
else if ((qRows ?? []).length === 0) ok('anon select on questions returned 0 rows (RLS moat holding)');
else bad(`MOAT BREACH: anon key read ${qRows.length} rows from questions!`);

console.log(failed ? '\nRESULT: FAILURES — see above.' : '\nRESULT: all checks passed.');
process.exit(failed ? 1 : 0);
