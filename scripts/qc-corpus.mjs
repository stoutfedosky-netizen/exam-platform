#!/usr/bin/env node
//
// Corpus-level QC — the checks the per-batch qc:<exam> scripts structurally cannot run.
//
// The per-exam QC scripts validate one batch at a time against its spec. That
// leaves two blind spots:
//   1. Anything spanning batches — a distractor recycled across 200 files, a
//      scenario template reused 75 times, a global answer-key skew.
//   2. Anything where the generator's own misunderstanding infected both the
//      writing and the self-check.
// This script reads the whole batches/ corpus at once and reports on both.
//
// Usage:
//   node scripts/qc-corpus.mjs                 # all exams
//   node scripts/qc-corpus.mjs --exam pmp      # one exam
//   node scripts/qc-corpus.mjs --dir batches   # alternate corpus dir
//
// Writes batches/CORPUS_QC_REPORT.md (human) + CORPUS_QC_FINDINGS.json (full
// remediation data, including every recycled distractor with its question IDs).
// Exits non-zero if any BLOCKER or HIGH finding exists, so it can gate an import.

import { globSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── Thresholds ────────────────────────────────────────────────────────────
// These mirror the "Corpus-Level Rules" section (C1-C9) now carried by every
// *_BATCH_SPEC.md. Keep the two in sync — the spec is the contract, this is
// the enforcement.
const T = {
  choiceMinLen: 40,        // C1: only long choices count (short ones legitimately repeat)
  choiceReuseFlag: 3,      // C1: >2 occurrences is a violation
  choiceReuseHigh: 10,     // ... and at this many it is HIGH severity
  openingWords: 8,         // C5/C6: scenario "opening" = first N words
  openingMinLen: 60,       // ignore trivially short passages
  openingDiversityHigh: 0.25,   // distinct openings / scenarios: below this = HIGH
  openingDiversityMed: 0.60,    // C5: >= 0.60 required
  openingShareCap: 3,      // C6: no single opening shared by more than 3 scenarios
  letterSkewMed: 3.0,      // C8: within +/-3 percentage points of uniform
  letterSkewHigh: 5.0,
  topicShareFlag: 0.15,    // C9: no single topic above 15% of an exam
  tailWords: 6,            // C4: template-suffix detector window
  tailReuseFlag: 11,       // C4: a 6-word tail across >10 choices is a template slot
  listCap: 25,             // max rows rendered per section in the markdown report
};

// Choices that are IDENTICAL BY SPEC and must not be reported as recycled.
const CANONICAL_CHOICE = [
  /^statement \(1\) alone is sufficient/i,
  /^statement \(2\) alone is sufficient/i,
  /^both statements together are sufficient/i,
  /^each statement alone is sufficient/i,
  /^statements \(1\) and \(2\) together are not sufficient/i,
  /^no change$/i,
];
const isCanonicalChoice = (t) => CANONICAL_CHOICE.some((re) => re.test(t));

// ── Load corpus ───────────────────────────────────────────────────────────
function loadCorpus(dir) {
  const questions = [];
  const batches = [];
  const skipped = [];
  for (const file of globSync(`${dir}/*.json`).sort()) {
    let doc;
    try {
      doc = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      skipped.push([basename(file), "unparseable JSON"]);
      continue;
    }
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
      skipped.push([basename(file), "not a batch object"]);
      continue;
    }
    if (!Array.isArray(doc.questions)) {
      skipped.push([basename(file), "no questions array (manifest/report)"]);
      continue;
    }
    batches.push({ file: basename(file), exam: doc.exam, section: doc.section, batch: doc.batch });
    for (const q of doc.questions) {
      if (q && typeof q === "object") {
        questions.push({ ...q, _file: basename(file), _exam: doc.exam, _section: doc.section, _batch: doc.batch });
      }
    }
  }
  return { questions, batches, skipped };
}

// ── Findings ──────────────────────────────────────────────────────────────
const findings = [];
const add = (severity, exam, check, summary, detail = null) =>
  findings.push({ severity, exam, check, summary, detail });

const pct = (n, d) => (d ? (100 * n) / d : 0);
const byExam = (qs) => {
  const m = new Map();
  for (const q of qs) {
    if (!m.has(q._exam)) m.set(q._exam, []);
    m.get(q._exam).push(q);
  }
  return m;
};

// 1. Integrity — duplicate IDs would be silently skipped by the importer
//    (it upserts with ignoreDuplicates), so fewer questions land than expected.
function checkIds(questions, batches) {
  const qid = new Map();
  for (const q of questions) {
    if (!q.id) continue;
    if (!qid.has(q.id)) qid.set(q.id, []);
    qid.get(q.id).push(`${q._file}`);
  }
  const dupes = [...qid.entries()].filter(([, f]) => f.length > 1);
  if (dupes.length) {
    add("BLOCKER", "*", "duplicate-question-id",
      `${dupes.length} question ID(s) appear in more than one batch — the importer skips duplicates, so these questions would silently not land.`,
      dupes.map(([id, files]) => ({ id, files })));
  }

  const bid = new Map();
  for (const b of batches) {
    if (!b.batch) continue;
    if (!bid.has(b.batch)) bid.set(b.batch, []);
    bid.get(b.batch).push(b.file);
  }
  const bdupes = [...bid.entries()].filter(([, f]) => f.length > 1);
  if (bdupes.length) {
    add("BLOCKER", "*", "duplicate-batch-id",
      `${bdupes.length} batch ID(s) used by more than one file.`,
      bdupes.map(([id, files]) => ({ id, files })));
  }
}

// 2. Answer key integrity — exactly one explanation carries the "Correct." prefix
//    and it is the keyed letter.
function checkKeyAgreement(questions) {
  const bad = [];
  for (const q of questions) {
    const ex = q.explanations || {};
    const marked = Object.entries(ex)
      .filter(([, v]) => typeof v === "string" && v.trim().startsWith("Correct."))
      .map(([k]) => k);
    if (marked.length !== 1 || marked[0] !== q.correct) {
      bad.push({ id: q.id, file: q._file, keyed: q.correct, markedCorrect: marked });
    }
  }
  if (bad.length) {
    add("BLOCKER", "*", "key-explanation-mismatch",
      `${bad.length} question(s) where the "Correct."-prefixed explanation does not match the keyed answer.`,
      bad);
  }
}

// 3. Recycled distractors — the defect per-batch QC cannot see. Every spec
//    requires each wrong answer to be tempting for a SPECIFIC reason; a choice
//    reused across dozens of questions is boilerplate filler by definition.
function checkRecycledChoices(questions) {
  for (const [exam, qs] of byExam(questions)) {
    const uses = new Map();
    for (const q of qs) {
      for (const c of q.choices || []) {
        const raw = (c?.text || "").trim();
        if (raw.length < T.choiceMinLen) continue;
        const key = raw.toLowerCase();
        if (isCanonicalChoice(key)) continue;
        if (!uses.has(key)) uses.set(key, { text: raw, ids: [] });
        uses.get(key).ids.push(q.id);
      }
    }
    const recycled = [...uses.values()]
      .filter((u) => u.ids.length >= T.choiceReuseFlag)
      .sort((a, b) => b.ids.length - a.ids.length);
    if (!recycled.length) continue;
    const worst = recycled[0].ids.length;
    const affected = new Set(recycled.flatMap((r) => r.ids)).size;
    add(worst >= T.choiceReuseHigh ? "HIGH" : "MEDIUM", exam, "recycled-distractor",
      `${recycled.length} distinct choice texts reused ${T.choiceReuseFlag}+ times (worst: ${worst}x), touching ${affected} questions. Recycled distractors cannot be question-specific.`,
      recycled.map((r) => ({ uses: r.ids.length, text: r.text, questionIds: r.ids })));
  }
}

// 3c. C10 — internal boilerplate. Position-independent successor to the
//     template-suffix check. The first regeneration defeated exact-match (C1/C2)
//     and the tail check (C4) by appending a per-item-varying filler clause
//     ("…within this bounded", "…at the final stage in '18", "…under the
//     conditions described in the item within this…") so the surface string and
//     the last 6 words differ while the distractor stays boilerplate. This scans
//     for any normalized 8-word phrase, numbers stripped, that recurs across a
//     large share of an exam's choices — regardless of where it sits.
function checkInternalBoilerplate(questions) {
  const NORM = (s) =>
    (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\b\d{1,4}\b/g, " ").replace(/\s+/g, " ").trim();
  for (const [exam, qs] of byExam(questions)) {
    const choiceCount = qs.reduce((n, q) => n + (q.choices?.length || 0), 0);
    if (choiceCount < 100) continue;
    const gram = new Map(); // 8-gram -> Set of choice indices it appears in
    let idx = 0;
    for (const q of qs) {
      for (const c of q.choices || []) {
        const raw = (c?.text || "").trim().toLowerCase();
        if (isCanonicalChoice(raw)) { idx++; continue; }
        const w = NORM(c?.text).split(" ").filter(Boolean);
        const local = new Set();
        for (let i = 0; i + 8 <= w.length; i++) local.add(w.slice(i, i + 8).join(" "));
        for (const g of local) {
          if (!gram.has(g)) gram.set(g, new Set());
          gram.get(g).add(idx);
        }
        idx++;
      }
    }
    const floor = Math.max(15, Math.round(choiceCount * 0.01)); // >=1% of choices, min 15
    const hits = [...gram.entries()]
      .map(([g, s]) => ({ phrase: g, choices: s.size, share: +pct(s.size, choiceCount).toFixed(1) }))
      .filter((h) => h.choices >= floor)
      .sort((a, b) => b.choices - a.choices);
    if (!hits.length) continue;
    // collapse overlapping sub-phrases of the single worst offender for readability
    const top = hits[0];
    const sev = top.share >= 10 ? "HIGH" : "MEDIUM";
    add(sev, exam, "internal-boilerplate",
      `A recurring filler phrase appears in ${top.share}% of this exam's choices (worst 8-gram "${top.phrase}" in ${top.choices} choices; ${hits.length} distinct high-frequency phrases total). This is manufactured boilerplate — the same distractor with a per-item-varying tail to defeat exact-match dedup.`,
      hits.slice(0, T.listCap).map((h) => ({ uses: h.choices, share: `${h.share}%`, phrase: h.phrase })));
  }
}

// 4. Template-suffix detector — catches generator "slot" phrases like
//    "…, under the conditions described in the item."
function checkTemplateSuffixes(questions) {
  for (const [exam, qs] of byExam(questions)) {
    const tails = new Map();
    for (const q of qs) {
      for (const c of q.choices || []) {
        const raw = (c?.text || "").trim();
        if (isCanonicalChoice(raw.toLowerCase())) continue;
        const words = raw.replace(/[.?!]+$/, "").split(/\s+/);
        if (words.length < T.tailWords + 3) continue;
        const tail = words.slice(-T.tailWords).join(" ").toLowerCase();
        if (!tails.has(tail)) tails.set(tail, []);
        tails.get(tail).push(q.id);
      }
    }
    const slots = [...tails.entries()]
      .filter(([, ids]) => ids.length >= T.tailReuseFlag)
      .sort((a, b) => b[1].length - a[1].length);
    if (!slots.length) continue;
    add("MEDIUM", exam, "template-suffix",
      `${slots.length} trailing phrase(s) repeat ${T.tailReuseFlag}+ times across choices — a sign choices were filled from a template rather than written to the item.`,
      slots.map(([tail, ids]) => ({ uses: ids.length, tail, sampleIds: ids.slice(0, 8) })));
  }
}

// 3b. C2 — choice-set uniqueness. Two questions carrying an identical full set
//     of options are the same item wearing different stems.
function checkDuplicateChoiceSets(questions) {
  for (const [exam, qs] of byExam(questions)) {
    const sets = new Map();
    for (const q of qs) {
      const choices = q.choices || [];
      if (!choices.length) continue;
      if (choices.every((c) => isCanonicalChoice((c?.text || "").trim().toLowerCase()))) continue;
      const key = choices.map((c) => (c?.text || "").trim().toLowerCase()).join(" | ");
      if (!sets.has(key)) sets.set(key, []);
      sets.get(key).push(q.id);
    }
    const dupes = [...sets.entries()]
      .filter(([, ids]) => ids.length > 1)
      .sort((a, b) => b[1].length - a[1].length);
    if (!dupes.length) continue;
    const affected = dupes.reduce((n, [, ids]) => n + ids.length, 0);
    add(dupes[0][1].length >= 5 ? "HIGH" : "MEDIUM", exam, "duplicate-choice-set",
      `${dupes.length} choice set(s) shared by more than one question (worst: ${dupes[0][1].length} questions), affecting ${affected} questions.`,
      dupes.map(([key, ids]) => ({ uses: ids.length, questionIds: ids, choices: key.slice(0, 130) })));
  }
}

// 4b. Positional cloning — questions occupying the SAME slot across batches
//     sharing a choice set. Distinct from generic recycling: it points at
//     template-per-slot generation, meaning batches are structural near-clones
//     of one another rather than independently authored.
function checkPositionalCloning(questions) {
  for (const [exam, qs] of byExam(questions)) {
    const slots = new Map();
    for (const q of qs) {
      if (q.sortOrder == null) continue;
      if (!slots.has(q.sortOrder)) slots.set(q.sortOrder, []);
      slots.get(q.sortOrder).push(q);
    }
    const hits = [];
    for (const [slot, group] of slots) {
      if (group.length < 5) continue;
      const sig = new Map();
      for (const q of group) {
        const key = (q.choices || []).map((c) => (c?.text || "").trim().toLowerCase()).join(" | ");
        // a wholly canonical choice set (e.g. GMAT Data Sufficiency) repeats by spec
        if (!key || (q.choices || []).every((c) => isCanonicalChoice((c?.text || "").trim().toLowerCase()))) continue;
        if (!sig.has(key)) sig.set(key, []);
        sig.get(key).push(q.id);
      }
      const worst = [...sig.values()].sort((a, b) => b.length - a.length)[0];
      if (!worst || worst.length < 3) continue;
      const rate = worst.length / group.length;
      if (rate >= 0.05) {
        hits.push({ slot, cloned: worst.length, slotTotal: group.length, rate: +(rate * 100).toFixed(1), sampleIds: worst.slice(0, 6) });
      }
    }
    if (!hits.length) continue;
    hits.sort((a, b) => b.rate - a.rate);
    add(hits[0].rate >= 10 ? "HIGH" : "MEDIUM", exam, "positional-cloning",
      `${hits.length} slot position(s) where questions across different batches share an identical choice set (worst: slot ${hits[0].slot}, ${hits[0].rate}%). Indicates per-slot templating rather than independent authoring.`,
      hits);
  }
}

// 5. Scenario duplication + opening-phrase concentration.
function checkScenarioDiversity(questions) {
  for (const [exam, qs] of byExam(questions)) {
    const scenarios = qs
      .map((q) => ({ id: q.id, text: (q.passage || "").trim() }))
      .filter((s) => s.text.length > T.openingMinLen);
    if (scenarios.length < 20) continue;

    // exact duplicates
    const exact = new Map();
    for (const s of scenarios) {
      const k = s.text.toLowerCase();
      if (!exact.has(k)) exact.set(k, []);
      exact.get(k).push(s.id);
    }
    const dupes = [...exact.entries()].filter(([, ids]) => ids.length > 1);
    if (dupes.length) {
      add("HIGH", exam, "duplicate-scenario",
        `${dupes.length} scenario(s) appear verbatim on more than one question.`,
        dupes.map(([text, ids]) => ({ uses: ids.length, questionIds: ids, text: text.slice(0, 160) })));
    }

    // opening concentration
    const openings = new Map();
    for (const s of scenarios) {
      const k = s.text.split(/\s+/).slice(0, T.openingWords).join(" ").toLowerCase();
      if (!openings.has(k)) openings.set(k, []);
      openings.get(k).push(s.id);
    }
    const diversity = openings.size / scenarios.length;
    const ranked = [...openings.entries()].sort((a, b) => b[1].length - a[1].length);
    const top20 = ranked.slice(0, 20).reduce((n, [, ids]) => n + ids.length, 0);
    const sev = diversity < T.openingDiversityHigh ? "HIGH"
              : diversity < T.openingDiversityMed ? "MEDIUM" : null;
    if (sev) {
      add(sev, exam, "scenario-templating",
        `C5: only ${openings.size} distinct openings across ${scenarios.length} scenarios (${(diversity * 100).toFixed(1)}% diversity, spec requires >= ${(T.openingDiversityMed * 100).toFixed(0)}%); the top 20 openings cover ${pct(top20, scenarios.length).toFixed(1)}% of all scenarios.`,
        ranked.filter(([, ids]) => ids.length > 2)
          .map(([opening, ids]) => ({ uses: ids.length, opening, sampleIds: ids.slice(0, 6) })));
    }

    // C6 — no single opening shared by more than N scenarios
    const overCap = ranked.filter(([, ids]) => ids.length > T.openingShareCap);
    if (overCap.length) {
      add(overCap[0][1].length >= T.openingShareCap * 4 ? "HIGH" : "MEDIUM", exam, "scenario-opening-cap",
        `C6: ${overCap.length} opening(s) shared by more than ${T.openingShareCap} scenarios (worst: ${overCap[0][1].length}).`,
        overCap.map(([opening, ids]) => ({ uses: ids.length, opening, sampleIds: ids.slice(0, 6) })));
    }
  }
}

// 6. Corpus-level answer-key distribution. Per-batch rules can all pass while
//    the corpus skews — a test-wise guesser exploits the corpus, not the batch.
function checkLetterDistribution(questions) {
  for (const [exam, qs] of byExam(questions)) {
    const counts = new Map();
    for (const q of qs) counts.set(q.correct, (counts.get(q.correct) || 0) + 1);
    const letters = [...counts.keys()].filter(Boolean).sort();
    if (letters.length < 2) continue;
    const total = qs.length;
    const uniform = 100 / letters.length;
    const dist = letters.map((l) => ({
      letter: l,
      n: counts.get(l),
      pct: +pct(counts.get(l), total).toFixed(2),
      deltaPP: +(pct(counts.get(l), total) - uniform).toFixed(2),
    }));
    const worst = Math.max(...dist.map((d) => Math.abs(d.deltaPP)));
    const sev = worst >= T.letterSkewHigh ? "HIGH" : worst >= T.letterSkewMed ? "MEDIUM" : null;
    if (sev) {
      add(sev, exam, "letter-skew",
        `Answer key deviates up to ${worst.toFixed(1)} percentage points from uniform across ${total} questions (uniform = ${uniform.toFixed(1)}%).`,
        dist);
    }
  }
}

// 7. Topic coverage vs. concentration — are N questions spanning the blueprint,
//    or re-cutting a handful of topics?
function checkTopicConcentration(questions) {
  for (const [exam, qs] of byExam(questions)) {
    const counts = new Map();
    for (const q of qs) if (q.topic) counts.set(q.topic, (counts.get(q.topic) || 0) + 1);
    if (counts.size < 2) continue;
    const total = qs.length;
    const over = [...counts.entries()]
      .filter(([, n]) => n / total > T.topicShareFlag)
      .sort((a, b) => b[1] - a[1]);
    if (over.length) {
      add("MEDIUM", exam, "topic-concentration",
        `${over.length} topic(s) each account for more than ${(T.topicShareFlag * 100).toFixed(0)}% of the exam's ${total} questions.`,
        over.map(([topic, n]) => ({ topic, n, pct: +pct(n, total).toFixed(1) })));
    }
    add("INFO", exam, "topic-coverage",
      `${counts.size} distinct topics across ${total} questions.`,
      [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([topic, n]) => ({ topic, n })));
  }
}

// 8. Figures — validity, and whether the question actually refers to the artwork.
function checkFigures(questions) {
  const FIG_REF = /figure|chart|graph|shown|depicted|panel|structure|diagram|plotted/i;
  for (const [exam, qs] of byExam(questions)) {
    const withFig = qs.filter((q) => q.figure?.svg);
    if (!withFig.length) continue;
    const invalid = [];
    const unreferenced = [];
    for (const q of withFig) {
      const svg = q.figure.svg;
      const problems = [];
      if (!/xmlns=/.test(svg)) problems.push("missing xmlns");
      if (!/viewBox=/.test(svg)) problems.push("missing viewBox");
      if (/<script/i.test(svg)) problems.push("contains <script>");
      if (/xlink:href|(?<!xmlns:x)link href=/i.test(svg)) problems.push("external reference");
      if (/<image/i.test(svg)) problems.push("embedded raster <image>");
      if (problems.length) invalid.push({ id: q.id, file: q._file, problems });

      const blob = [q.stem, q.passage, ...Object.values(q.explanations || {})].join(" ");
      if (!FIG_REF.test(blob)) unreferenced.push({ id: q.id, file: q._file });
    }
    if (invalid.length) {
      add("BLOCKER", exam, "invalid-figure-svg",
        `${invalid.length} figure(s) fail the self-contained SVG contract.`, invalid);
    }
    if (unreferenced.length) {
      add("MEDIUM", exam, "unreferenced-figure",
        `${unreferenced.length} figure(s) are never referred to by their question — decorative artwork.`,
        unreferenced);
    }
    add("INFO", exam, "figure-count",
      `${withFig.length} of ${qs.length} questions carry a figure (${pct(withFig.length, qs.length).toFixed(1)}%).`);
  }
}

// 9. Explanation length regression guard (per-batch QC already enforces this;
//    kept here so a future generation change cannot quietly break it).
function checkExplanationLengths(questions) {
  for (const [exam, qs] of byExam(questions)) {
    let badCorrect = 0, badWrong = 0, nC = 0, nW = 0;
    const samples = [];
    for (const q of qs) {
      for (const [label, text] of Object.entries(q.explanations || {})) {
        if (typeof text !== "string") continue;
        const isKey = label === q.correct;
        const [lo, hi] = isKey ? [400, 600] : [250, 450];
        if (isKey) nC++; else nW++;
        if (text.length < lo || text.length > hi) {
          if (isKey) badCorrect++; else badWrong++;
          if (samples.length < 40) samples.push({ id: q.id, label, len: text.length, expected: `${lo}-${hi}` });
        }
      }
    }
    if (badCorrect || badWrong) {
      add("MEDIUM", exam, "explanation-length",
        `${badCorrect}/${nC} correct and ${badWrong}/${nW} wrong explanations fall outside the spec length bands.`,
        samples);
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────
const SEV_ORDER = { BLOCKER: 0, HIGH: 1, MEDIUM: 2, INFO: 3 };

function renderMarkdown(corpus, examFilter) {
  const { questions, batches, skipped } = corpus;
  const real = findings.filter((f) => f.severity !== "INFO");
  const counts = { BLOCKER: 0, HIGH: 0, MEDIUM: 0 };
  for (const f of real) counts[f.severity] = (counts[f.severity] || 0) + 1;

  const exams = [...new Set(questions.map((q) => q._exam))].sort();
  const L = [];
  L.push("# Corpus QC Report");
  L.push("");
  L.push(`Generated ${new Date().toISOString().slice(0, 10)}${examFilter ? ` — filtered to \`${examFilter}\`` : ""}.`);
  L.push("");
  L.push("These are the cross-batch checks the per-exam `qc:<exam>` scripts cannot run:");
  L.push("a batch-scoped validator sees 10 questions at a time and therefore cannot detect a");
  L.push("distractor recycled across 200 files, a scenario template reused 75 times, or a");
  L.push("global answer-key skew. Findings here are additional to, not a replacement for, those runs.");
  L.push("");
  L.push(`**Corpus:** ${questions.length.toLocaleString()} questions · ${batches.length.toLocaleString()} batch files · ${exams.length} exams`);
  L.push("");
  L.push(`**Findings:** ${counts.BLOCKER || 0} blocker · ${counts.HIGH || 0} high · ${counts.MEDIUM || 0} medium`);
  L.push("");

  // per-exam summary
  L.push("## Summary by exam");
  L.push("");
  L.push("| Exam | Questions | Blocker | High | Medium | Checks flagged |");
  L.push("|---|---:|---:|---:|---:|---|");
  for (const ex of exams) {
    const fs = real.filter((f) => f.exam === ex || f.exam === "*");
    const c = { BLOCKER: 0, HIGH: 0, MEDIUM: 0 };
    for (const f of fs) c[f.severity]++;
    const names = [...new Set(fs.map((f) => f.check))].join(", ") || "—";
    const n = questions.filter((q) => q._exam === ex).length;
    L.push(`| ${ex} | ${n.toLocaleString()} | ${c.BLOCKER} | ${c.HIGH} | ${c.MEDIUM} | ${names} |`);
  }
  L.push("");

  // findings
  L.push("## Findings");
  L.push("");
  const sorted = [...real].sort(
    (a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.exam.localeCompare(b.exam)
  );
  if (!sorted.length) L.push("_No blocker, high, or medium findings._");
  for (const f of sorted) {
    L.push(`### \`${f.severity}\` · ${f.exam} · ${f.check}`);
    L.push("");
    L.push(f.summary);
    L.push("");
    if (Array.isArray(f.detail) && f.detail.length) {
      const rows = f.detail.slice(0, T.listCap);
      const keys = Object.keys(rows[0]);
      L.push(`| ${keys.join(" | ")} |`);
      L.push(`|${keys.map(() => "---").join("|")}|`);
      for (const r of rows) {
        L.push(`| ${keys.map((k) => {
          const v = r[k];
          const s = Array.isArray(v) ? v.slice(0, 4).join(", ") + (v.length > 4 ? ` …+${v.length - 4}` : "") : String(v);
          return s.replace(/\|/g, "\\|").slice(0, 150);
        }).join(" | ")} |`);
      }
      if (f.detail.length > rows.length) {
        L.push("");
        L.push(`_${f.detail.length - rows.length} more — see \`CORPUS_QC_FINDINGS.json\`._`);
      }
      L.push("");
    }
  }

  // info appendix
  const info = findings.filter((f) => f.severity === "INFO");
  if (info.length) {
    L.push("## Reference data");
    L.push("");
    for (const f of info) L.push(`- **${f.exam} · ${f.check}** — ${f.summary}`);
    L.push("");
  }

  if (skipped.length) {
    L.push("## Non-batch files skipped");
    L.push("");
    for (const [file, why] of skipped) L.push(`- \`${file}\` — ${why}`);
    L.push("");
  }
  return L.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const examFilter = argv.includes("--exam") ? argv[argv.indexOf("--exam") + 1] : null;
const dirArg = argv.includes("--dir") ? argv[argv.indexOf("--dir") + 1] : "batches";
const DIR = resolve(ROOT, dirArg);

const corpus = loadCorpus(DIR);
if (examFilter) {
  corpus.questions = corpus.questions.filter((q) => q._exam === examFilter);
  corpus.batches = corpus.batches.filter((b) => b.exam === examFilter);
}
if (!corpus.questions.length) {
  console.error(`No questions found in ${DIR}${examFilter ? ` for exam "${examFilter}"` : ""}.`);
  process.exit(1);
}

checkIds(corpus.questions, corpus.batches);
checkKeyAgreement(corpus.questions);
checkRecycledChoices(corpus.questions);
checkDuplicateChoiceSets(corpus.questions);
checkInternalBoilerplate(corpus.questions);
checkTemplateSuffixes(corpus.questions);
checkPositionalCloning(corpus.questions);
checkScenarioDiversity(corpus.questions);
checkLetterDistribution(corpus.questions);
checkTopicConcentration(corpus.questions);
checkFigures(corpus.questions);
checkExplanationLengths(corpus.questions);

const md = renderMarkdown(corpus, examFilter);
const reportPath = resolve(DIR, "CORPUS_QC_REPORT.md");
const jsonPath = resolve(DIR, "CORPUS_QC_FINDINGS.json");
writeFileSync(reportPath, md);
writeFileSync(jsonPath, JSON.stringify({
  generated: new Date().toISOString(),
  corpus: { questions: corpus.questions.length, batches: corpus.batches.length },
  findings,
}, null, 2));

const real = findings.filter((f) => f.severity !== "INFO");
const c = { BLOCKER: 0, HIGH: 0, MEDIUM: 0 };
for (const f of real) c[f.severity]++;

console.log(`\n══ Corpus QC ══`);
console.log(`  Questions : ${corpus.questions.length.toLocaleString()} in ${corpus.batches.length.toLocaleString()} batches`);
console.log(`  Blocker   : ${c.BLOCKER}`);
console.log(`  High      : ${c.HIGH}`);
console.log(`  Medium    : ${c.MEDIUM}`);
console.log(`  Report    : ${reportPath.replace(ROOT + "/", "")}`);
console.log(`  Findings  : ${jsonPath.replace(ROOT + "/", "")}`);
for (const f of real.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]).slice(0, 12)) {
  console.log(`  [${f.severity}] ${f.exam} ${f.check}: ${f.summary.slice(0, 95)}`);
}
console.log("");
process.exit(c.BLOCKER > 0 || c.HIGH > 0 ? 1 : 0);
