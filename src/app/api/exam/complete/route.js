// POST /api/exam/complete   body: { sessionId }
// Grades SERVER-SIDE (answers never left the server), writes attempts, computes
// raw + scaled score, and returns the answer key so the review screen can render.
// Intended path: src/app/api/exam/complete/route.js
import { admin, getUserId, unauthorized } from '@/lib/server/exam-server';
import { toScaledScore } from '@/config/exams.config';

export async function POST(req) {
  const userId = await getUserId(req);
  if (!userId) return unauthorized();

  const { sessionId } = await req.json();

  const { data: session, error } = await admin
    .from('exam_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single();
  if (error || !session) return Response.json({ error: 'not found' }, { status: 404 });
  if (session.status === 'completed')
    return Response.json({ error: 'already completed' }, { status: 409 });

  // Load answers for the frozen id set (service role only).
  const { data: rows } = await admin
    .from('questions')
    .select('id, correct_answer, explanations')
    .in('id', session.question_ids);
  const byId = Object.fromEntries((rows ?? []).map((r) => [r.id, r]));

  // Grade against the autosaved answers.
  const answers = session.answers || {};
  let correct = 0;
  const attempts = session.question_ids.map((qid) => {
    const selected  = answers[qid] ?? null;
    const isCorrect = selected != null && selected === byId[qid]?.correct_answer;
    if (isCorrect) correct += 1;
    return {
      session_id: sessionId,
      user_id: userId,
      question_id: qid,
      selected_answer: selected,
      is_correct: isCorrect,
      // time_spent_seconds: pull from a per-question timing map if the client sends one
    };
  });

  await admin.from('question_attempts').insert(attempts);

  const rawTotal = session.question_ids.length;
  const scaled   = toScaledScore(session.exam_id, correct, rawTotal);

  await admin.from('exam_sessions').update({
    status: 'completed',
    raw_correct: correct,
    raw_total: rawTotal,
    scaled_score: scaled,
    completed_at: new Date().toISOString(),
  }).eq('id', sessionId);

  // Return the answer key (+ explanations) so the review screen can render.
  return Response.json({
    rawCorrect: correct,
    rawTotal,
    scaledScore: scaled,
    answerKey: session.question_ids.map((id) => ({
      id,
      correct: byId[id]?.correct_answer,
      explanations: byId[id]?.explanations,
    })),
  });
}
