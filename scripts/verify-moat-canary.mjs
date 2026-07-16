// Non-vacuous proof of the answer moat.
//
// `scripts/verify-moat.mjs` asserts the anon key reads 0 rows from `questions`
// — but while the table is empty that passes trivially, RLS or no RLS. This
// script inserts ONE canary question via the service role, proves the anon key
// still cannot see it (and that the service role can), then deletes the canary.
//
//   node scripts/verify-moat-canary.mjs
//
// Only ever touches its own canary row (id: _moat_canary_*). Cleanup runs in a
// finally block so an aborted run cannot leave the row behind.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const CANARY_ID = `_moat_canary_${Date.now()}`;
let failed = false;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { failed = true; console.error(`  FAIL  ${m}`); };

try {
  // 1. Plant the canary (service role bypasses RLS).
  const { error: insErr } = await admin.from('questions').insert({
    id: CANARY_ID,
    exam_id: 'lsat',
    section_id: 'lsat_lr',
    batch: '_canary',
    stem: 'CANARY: if a client can read this, the moat is broken.',
    choices: [{ label: 'A', text: 'canary' }],
    correct_answer: 'A',
    explanations: { A: 'CANARY SECRET — must never reach a browser' },
  });
  if (insErr) {
    bad(`could not plant canary: ${insErr.message}`);
    process.exit(1);
  }
  ok(`canary planted (${CANARY_ID}) — questions table is now non-empty`);

  // 2. Service role CAN see it (proves the row is really there).
  const { data: adminRows } = await admin.from('questions').select('*').eq('id', CANARY_ID);
  if (adminRows?.length === 1) ok('service role reads the canary (row genuinely exists)');
  else bad('service role could not read the canary it just inserted');

  // 3. THE REAL TEST: anon must NOT see it.
  const { data: anonRows, error: anonErr } = await anon.from('questions').select('*');
  if (anonErr) ok(`anon select rejected: ${anonErr.message}`);
  else if ((anonRows ?? []).length === 0) ok('anon reads 0 rows WHILE a row exists — RLS moat proven');
  else bad(`MOAT BREACH: anon read ${anonRows.length} row(s): ${JSON.stringify(anonRows)}`);

  // 4. Anon targeting the canary directly by id must also come back empty.
  const { data: targeted, error: targetErr } = await anon.from('questions').select('*').eq('id', CANARY_ID);
  if (targetErr) ok(`anon targeted select rejected: ${targetErr.message}`);
  else if ((targeted ?? []).length === 0) ok('anon cannot read the canary even by exact id');
  else bad(`MOAT BREACH: anon read the canary by id: ${JSON.stringify(targeted)}`);

  // 5. Anon must not be able to write either.
  const { error: writeErr } = await anon.from('questions').insert({
    id: '_moat_canary_anon_write', exam_id: 'lsat', section_id: 'lsat_lr',
    stem: 'x', choices: [], correct_answer: 'A',
  });
  if (writeErr) ok(`anon insert rejected: ${writeErr.message}`);
  else bad('MOAT BREACH: anon inserted a row into questions!');
} finally {
  // 6. Always remove the canary. Scoped to this run's id — nothing else.
  const { error: delErr } = await admin.from('questions').delete().eq('id', CANARY_ID);
  await admin.from('questions').delete().eq('id', '_moat_canary_anon_write');
  if (delErr) console.error(`  WARN  canary cleanup failed, remove ${CANARY_ID} manually: ${delErr.message}`);
  else console.log(`  PASS  canary removed (questions table back to empty)`);
}

console.log(failed ? '\nRESULT: FAILURES — see above.' : '\nRESULT: moat proven non-vacuously.');
process.exit(failed ? 1 : 0);
