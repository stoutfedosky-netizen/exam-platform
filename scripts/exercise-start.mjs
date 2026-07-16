// Exercises POST /api/exam/start end-to-end with a real signed-in user.
// Prereqs: schema applied, .env.local filled, a test user created (Supabase
// dashboard -> Authentication -> Add user), and `npm run dev` running.
//
//   node scripts/exercise-start.mjs test@example.com yourpassword
//
// Signs in with the password grant, builds the sb-<ref>-auth-token cookie the
// way @supabase/ssr stores it, calls the route, and asserts the returned
// questions contain NO correct_answer / explanations.
import { readFileSync } from 'node:fs';

const [email, password, base = 'http://localhost:3000'] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: node scripts/exercise-start.mjs <email> <password> [baseUrl]');
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

// 1. Sign in (password grant) -> session JSON
const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anonKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const session = await authRes.json();
if (!authRes.ok || !session.access_token) {
  console.error('FAIL: sign-in failed:', JSON.stringify(session));
  process.exit(1);
}
console.log(`PASS  signed in as ${email}`);

// 2. Build the auth cookie exactly as @supabase/ssr stores it
const ref = new URL(url).hostname.split('.')[0];
const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;

// 3. Call the route
const res = await fetch(`${base}/api/exam/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ examId: 'lsat', sectionCode: 'lr', mode: 'practice', count: 5 }),
});
const body = await res.json();

if (res.status === 404 && body.error === 'no questions') {
  console.log('PASS  auth + route work end-to-end.');
  console.log('NOTE  pool is empty ("no questions") — expected until LSAT content is loaded.');
  process.exit(0);
}
if (!res.ok) {
  console.error(`FAIL  /api/exam/start -> ${res.status}:`, JSON.stringify(body));
  process.exit(1);
}

console.log(`PASS  session ${body.sessionId} created, timeLimit=${body.timeLimit}s, ${body.questions.length} questions`);
const leaks = body.questions.filter((q) => 'correct_answer' in q || 'explanations' in q);
if (leaks.length) {
  console.error(`FAIL  MOAT BREACH: ${leaks.length} question(s) contain correct_answer/explanations!`);
  process.exit(1);
}
console.log('PASS  no correct_answer or explanations in any returned question.');
