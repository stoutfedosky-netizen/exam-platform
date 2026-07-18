// POST /api/exam/start
// Selects questions SERVER-SIDE, creates a resumable session, and returns
// questions with correct answers + explanations stripped.
// Intended path: src/app/api/exam/start/route.js
import { admin, getUserId, sanitizeQuestion, selectWithPassageGroups, unauthorized }
  from '@/lib/server/exam-server';
import { getExam, sectionId, computeTimeLimit } from '@/config/exams.config';

export async function POST(req) {
  const userId = await getUserId(req);
  if (!userId) return unauthorized();

  const { examId, sectionCode, mode = 'practice', count = 25, filters = {} }
    = await req.json();

  getExam(examId); // validates the exam exists (throws otherwise)

  // 1. Read the pool (service role can read `questions`; the client cannot).
  let query = admin.from('questions').select('*').eq('exam_id', examId);
  if (sectionCode) query = query.eq('section_id', sectionId(examId, sectionCode));
  if (filters.topic)      query = query.eq('topic', filters.topic);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
  // (status filters — unseen/incorrect/flagged — join question_attempts here)

  query = query.order('batch').order('sort_order');
  const { data: pool, error } = await query;
  if (error)  return Response.json({ error: error.message }, { status: 500 });
  if (!pool?.length) return Response.json({ error: 'no questions' }, { status: 404 });

  // 2. Passage-group-aware selection, then freeze the ordered id list.
  const selected    = selectWithPassageGroups(pool, count);
  const questionIds = selected.map((q) => q.id);
  const timeLimit   = computeTimeLimit(examId, selected.length);

  // 3. Create the session (frozen selection makes resume + grading deterministic).
  const { data: session, error: sErr } = await admin
    .from('exam_sessions')
    .insert({
      user_id: userId,
      exam_id: examId,
      section_id: sectionCode ? sectionId(examId, sectionCode) : null,
      mode,
      question_ids: questionIds,
      time_remaining: timeLimit,
    })
    .select('id')
    .single();
  if (sErr) return Response.json({ error: sErr.message }, { status: 500 });

  // 4. Send questions WITHOUT answers/explanations.
  return Response.json({
    sessionId: session.id,
    timeLimit,
    questions: selected.map(sanitizeQuestion),
  });
}
