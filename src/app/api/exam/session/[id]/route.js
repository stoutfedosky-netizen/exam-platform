// GET /api/exam/session/[id]
// Resume: returns the saved session state + the frozen question set. Answers
// stay stripped until the session is completed (then they're revealed for review).
// Intended path: src/app/api/exam/session/[id]/route.js
//
// NOTE: mid-session autosave does NOT go through here. The client writes its
// own in-progress exam_sessions row directly via Supabase (RLS policy
// `sessions_update_own` permits it) — answers/flags/strikes/highlights/
// current_index/time_remaining. This route is only for (re)loading a session,
// because the client cannot read the `questions` table itself.
import { admin, getUserId, sanitizeQuestion, unauthorized }
  from '@/lib/server/exam-server';

export async function GET(req, { params }) {
  const userId = await getUserId(req);
  if (!userId) return unauthorized();

  const { id } = await params; // Next 15+: params is async

  const { data: session, error } = await admin
    .from('exam_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)          // ownership check
    .single();
  if (error || !session) return Response.json({ error: 'not found' }, { status: 404 });

  const { data: rows } = await admin
    .from('questions')
    .select('*')
    .in('id', session.question_ids);

  // Restore the frozen order (the .in() query does not preserve it).
  const byId    = Object.fromEntries((rows ?? []).map((r) => [r.id, r]));
  const ordered = session.question_ids.map((id) => byId[id]).filter(Boolean);

  const questions = session.status === 'completed'
    ? ordered                              // reveal answers for review
    : ordered.map(sanitizeQuestion);       // still hidden mid-session

  return Response.json({ session, questions });
}
