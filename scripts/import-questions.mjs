// Batch-imports question JSON files into Supabase (LSAT, PMP, ...).
// Usage:
//   node scripts/import-questions.mjs ./batches/LR-001.json
//   node scripts/import-questions.mjs ./batches/*.json
//
// Idempotent — existing IDs are skipped on re-run.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { globSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Per-exam validation rules: which sections exist and how many choices a
// question carries (LSAT = 5 choices A-E, PMP = 4 choices A-D).
const EXAM_RULES = {
  lsat: { sections: new Set(["lsat_lr", "lsat_rc"]), labels: ["A", "B", "C", "D", "E"] },
  pmp:  { sections: new Set(["pmp_people", "pmp_process", "pmp_business"]), labels: ["A", "B", "C", "D"] },
  gmat: { sections: new Set(["gmat_quant", "gmat_verbal", "gmat_di"]), labels: ["A", "B", "C", "D", "E"] },
};

function validate(q, exam, sectionId) {
  const errors = [];
  const rules = EXAM_RULES[exam];
  if (!rules) return [`unknown exam: ${exam}`];
  const { labels } = rules;
  const letterRange = `A-${labels[labels.length - 1]}`;
  if (!rules.sections.has(sectionId)) errors.push(`unknown section: ${sectionId}`);
  if (!Array.isArray(q.choices) || q.choices.length !== labels.length) {
    errors.push(`must have exactly ${labels.length} choices`);
  } else {
    const got = q.choices.map((c) => c.label).sort().join("");
    if (got !== labels.join("")) errors.push(`choice labels must be ${letterRange}, got: ${got}`);
  }
  if (!labels.includes(q.correct)) errors.push(`correct must be ${letterRange}, got: ${q.correct}`);
  if (!q.explanations || Object.keys(q.explanations).length !== labels.length) {
    errors.push(`must have ${labels.length} explanations`);
  } else {
    for (const l of labels) {
      if (!q.explanations[l]) errors.push(`missing explanation for ${l}`);
    }
  }
  return errors;
}

async function importFile(filePath) {
  const raw = readFileSync(resolve(filePath), "utf8");
  const data = JSON.parse(raw);
  const { exam, section, batch, passage_category, questions } = data;
  const sectionId = `${exam}_${section}`;

  console.log(`\n── ${batch} (${filePath}) ──`);

  const rows = [];
  let validationFailed = 0;

  for (const q of questions) {
    const errs = validate(q, exam, sectionId);
    if (errs.length) {
      console.error(`  ✗ ${q.id}: ${errs.join("; ")}`);
      validationFailed++;
      continue;
    }
    const row = {
      id: q.id,
      exam_id: exam,
      section_id: sectionId,
      batch,
      passage: q.passage,
      use_prev_passage: q.usePrevPassage ?? false,
      stem: q.stem,
      choices: q.choices,
      correct_answer: q.correct,
      explanations: q.explanations,
      topic: q.topic,
      difficulty: q.difficulty,
      sort_order: q.sortOrder,
    };
    if (passage_category && q.sortOrder === 0) {
      row.content_category = passage_category;
    }
    rows.push(row);
  }

  if (validationFailed) {
    console.log(`  ⚠ ${validationFailed} question(s) failed validation — skipped`);
  }
  if (!rows.length) {
    console.log("  Nothing to insert.");
    return { inserted: 0, skipped: 0, errors: validationFailed };
  }

  const { data: inserted, error } = await admin
    .from("questions")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error(`  ✗ DB error: ${error.message}`);
    return { inserted: 0, skipped: 0, errors: validationFailed, dbError: error.message };
  }

  const insertedCount = inserted?.length ?? 0;
  const skipped = rows.length - insertedCount;
  console.log(`  ✓ inserted: ${insertedCount}, skipped (existing): ${skipped}`);
  return { inserted: insertedCount, skipped, errors: validationFailed };
}

// ── Main ──
const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/import-questions.mjs <file|glob> ...");
  process.exit(1);
}

let totalInserted = 0;
let totalSkipped = 0;
let totalErrors = 0;

for (const filePath of args) {
  const result = await importFile(filePath);
  totalInserted += result.inserted;
  totalSkipped += result.skipped;
  totalErrors += result.errors;
}

console.log(`\n══ Summary ══`);
console.log(`  Inserted: ${totalInserted}`);
console.log(`  Skipped:  ${totalSkipped}`);
console.log(`  Errors:   ${totalErrors}`);
process.exit(totalErrors > 0 ? 1 : 0);
