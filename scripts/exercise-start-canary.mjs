// Non-vacuous end-to-end check of the /api/exam/start sanitization moat.
//
// exercise-start.mjs proves auth works, but with an empty pool it hits the
// "no questions" branch and never actually receives a question — so it can't
// prove the route STRIPS correct_answer/explanations. This one plants a canary
// question via the service role, signs in, calls the route, asserts the
// returned question is present but carries NO correct_answer/explanations,
// then removes the canary (finally block).
//
//   node scripts/exercise-start-canary.mjs <email> <password> [baseUrl]
//
// Only ever touches its own canary row (id: _start_canary_*).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const [email, password, base = 'http://localhost:3000'] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: node scripts/exercise-start-canary.mjs <email> <password> [baseUrl]');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const CANARY_ID = `_start_canary_${Date.now()}`;
const SECRET = 'CANARY SECRET — must never reach the browser';
let failed = false;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { failed = true; console.error(`  FAIL  ${m}`); };

try {
  // 1. Plant a canary question in the LR pool (service role bypasses RLS).
  const { error: insErr } = await admin.from('questions').insert({
    id: CANARY_ID, exam_id: 'lsat', section_id: 'lsat_lr', batch: '_canary',
    stem: 'Canary question — checks the /start sanitizer.',
    choices: [{ label: 'A', text: 'a' }, { label: 'B', text: 'b' }],
    correct_answer: 'B',
    explanations: { A: 'no', B: SECRET },
  });
  if (insErr) { bad(`could not plant canary: ${insErr.message}`); process.exit(1); }
  ok(`canary question planted in lsat_lr (${CANARY_ID})`);

  // 2. Sign in (password grant) and build the @supabase/ssr auth cookie.
  const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = await authRes.json();
  if (!authRes.ok || !session.access_token) { bad(`sign-in failed: ${JSON.stringify(session)}`); process.exit(1); }
  ok(`signed in as ${email}`);
  const ref = new URL(url).hostname.split('.')[0];
  const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;

  // 3. Call the route — pool now has exactly the canary.
  const res = await fetch(`${base}/api/exam/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ examId: 'lsat', sectionCode: 'lr', mode: 'practice', count: 5 }),
  });
  const body = await res.json();
  if (!res.ok) { bad(`/api/exam/start -> ${res.status}: ${JSON.stringify(body)}`); process.exit(1); }

  // 4. The canary must come back...
  const q = body.questions.find((x) => x.id === CANARY_ID);
  if (!q) { bad(`canary not in response: ${JSON.stringify(body.questions.map((x) => x.id))}`); }
  else {
    ok(`session ${body.sessionId} created; canary returned (route delivered a real question)`);
    // 5. ...but WITHOUT the gated fields.
    if ('correct_answer' in q) bad('MOAT BREACH: correct_answer present on returned question');
    else ok('no correct_answer on the returned question');
    if ('explanations' in q) bad('MOAT BREACH: explanations present on returned question');
    else ok('no explanations on the returned question');
    // 6. Belt-and-suspenders: the secret string appears nowhere in the payload.
    if (JSON.stringify(body).includes(SECRET)) bad('MOAT BREACH: canary secret string found in response body');
    else ok('canary secret string absent from entire response body');
  }
} finally {
  // 7. Remove the canary + the session row it created. Scoped to this run.
  await admin.from('questions').delete().eq('id', CANARY_ID);
  // sessions referencing the canary would dangle; delete this user's canary-only sessions
  const { data: sess } = await admin.from('exam_sessions').select('id, question_ids');
  for (const s of sess ?? []) {
    if (Array.isArray(s.question_ids) && s.question_ids.includes(CANARY_ID)) {
      await admin.from('exam_sessions').delete().eq('id', s.id);
    }
  }
  console.log('  PASS  canary question + its session removed');
}

console.log(failed ? '\nRESULT: FAILURES — see above.' : '\nRESULT: /start sanitization proven non-vacuously.');
process.exit(failed ? 1 : 0);
