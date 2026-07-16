// =====================================================================
// Exam config layer  (replaces mcat-mastery's hardcoded SECTIONS constant)
//
// Division of responsibility:
//   - The DB (exams / sections tables) is authoritative for the CONTENT graph
//     and section labels/colors.
//   - This file holds what the DB doesn't need to know: per-exam TIMING,
//     in-exam TOOLS, SCORING scale, and how a full timed simulation is
//     assembled from the content pools.
//
// Adding an exam later = add one entry to EXAMS + rows to the DB. No new
// tables, no engine changes.
// =====================================================================


// Registry of in-exam tools. ExamInterface renders one button per key listed
// in an exam's `tools` array. This is how the periodic table stops being
// hardcoded — MCAT would list ['periodic-table'], LSAT lists nothing.
export const TOOLS = {
  'periodic-table': { label: 'Periodic Table' },
  'calculator':     { label: 'Calculator' },   // e.g. NCLEX / GMAT DI later
  // 'desmos':      { label: 'Graphing Calculator' },  // SAT / ACT later
};


export const EXAMS = {
  lsat: {
    id: 'lsat',
    title: 'Law School Admission Test',
    shortName: 'LSAT',

    tools: [],   // LSAT has no in-exam tools

    // LSAT is SECTION-timed (35 min per section), not per-question.
    // (MCAT would use { mode: 'perQuestion', seconds: 95 }.)
    timing: { mode: 'perSection', seconds: 35 * 60 },

    // Full timed-test assembly, used by 'exam' mode. References content pools
    // by section `code`. The experimental section is unscored.
    simulation: {
      sections: [
        { code: 'lr', scored: true },
        { code: 'lr', scored: true },
        { code: 'rc', scored: true },
        { code: 'lr', scored: false },   // variable / experimental
      ],
      questionsPerSection: 26,
    },

    // raw -> scaled (120-180) conversion. Null for now: the score report shows
    // raw % until a real conversion table is dropped in. See toScaledScore().
    scale: null,

    theme: { accent: '#2b579a' },
  },

  // ---- add later, same shape ----
  // sat: { id:'sat', title:'SAT', shortName:'SAT', tools:['desmos'],
  //        timing:{ mode:'perModule', seconds:... }, scale:{...}, ... },
  // nclex: { ..., tools:['calculator'], ... },
};


// ---- helpers --------------------------------------------------------

export function getExam(examId) {
  const exam = EXAMS[examId];
  if (!exam) throw new Error(`Unknown exam: ${examId}`);
  return exam;
}

// Prefix a bare section code into its exam-scoped id: ('lsat','rc') -> 'lsat_rc'
export function sectionId(examId, code) {
  return `${examId}_${code}`;
}

// Compute a session's time limit (seconds) from config + question count.
export function computeTimeLimit(examId, questionCount) {
  const { timing } = getExam(examId);
  if (!timing) return null;
  switch (timing.mode) {
    case 'perQuestion': return questionCount * timing.seconds;
    case 'perSection':  return timing.seconds;
    default:            return timing.seconds ?? null;
  }
}

// Convert raw correct -> scaled score if the exam defines a scale, else null.
export function toScaledScore(examId, rawCorrect, rawTotal) {
  const { scale } = getExam(examId);
  if (!scale) return null;
  // Expect `scale` to expose lookup(rawCorrect, rawTotal). Placeholder for now.
  return typeof scale.lookup === 'function'
    ? scale.lookup(rawCorrect, rawTotal)
    : null;
}
