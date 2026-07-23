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

  pmp: {
    id: 'pmp',
    title: 'Project Management Professional',
    shortName: 'PMP',

    tools: ['calculator'],   // PMP has an on-screen calculator

    // PMP is question-timed in aggregate: 230 min / 180 questions ≈ 77 s each.
    timing: { mode: 'perQuestion', seconds: 77 },

    // The real exam mixes domains freely; this is a placeholder assembly that
    // roughly mirrors ECO weights (42/50/8) at 180 questions.
    simulation: {
      sections: [
        { code: 'people',   scored: true },
        { code: 'process',  scored: true },
        { code: 'business', scored: true },
      ],
      questionsPerSection: 60,
    },

    // PMP reports Above/At/Below Target per domain, not a numeric scale.
    scale: null,

    theme: { accent: '#7c3aed' },
  },

  gmat: {
    id: 'gmat',
    title: 'Graduate Management Admission Test',
    shortName: 'GMAT',

    // Real GMAT allows the on-screen calculator only in Data Insights;
    // tools are exam-wide for now, so it's listed here with that caveat.
    tools: ['calculator'],

    // GMAT Focus is SECTION-timed: 45 min per section.
    timing: { mode: 'perSection', seconds: 45 * 60 },

    // Focus Edition: 21 Quant / 23 Verbal / 20 Data Insights. questionsPerSection
    // is a single knob, so 21 approximates the per-section counts.
    simulation: {
      sections: [
        { code: 'quant',  scored: true },
        { code: 'verbal', scored: true },
        { code: 'di',     scored: true },
      ],
      questionsPerSection: 21,
    },

    // Focus Edition total score is 205-805; raw % until a conversion
    // table is dropped in.
    scale: null,

    theme: { accent: '#0f766e' },
  },

  act: {
    id: 'act',
    title: 'ACT',
    shortName: 'ACT',

    // Real ACT allows a calculator only on Math; tools are exam-wide for now.
    tools: ['calculator'],

    // Enhanced ACT section pacing varies (42-67 s/question); 60 s/question
    // approximates the overall 171 questions / 165 minutes.
    timing: { mode: 'perQuestion', seconds: 60 },

    // Enhanced ACT: English 50 / Math 45 / Reading 36 / Science 40 (optional,
    // scored separately). questionsPerSection approximates the mix.
    simulation: {
      sections: [
        { code: 'english', scored: true },
        { code: 'math',    scored: true },
        { code: 'reading', scored: true },
        { code: 'science', scored: false },   // optional; not in the composite
      ],
      questionsPerSection: 40,
    },

    // 1-36 per section, composite averages EN/MA/RD; raw % until a
    // conversion table is dropped in.
    scale: null,

    theme: { accent: '#be123c' },
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
