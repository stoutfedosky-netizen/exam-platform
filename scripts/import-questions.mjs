// Batch-imports LSAT question JSON files into Supabase.
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

const VALID_SECTIONS = new Set(["lsat_lr", "lsat_rc"]);
const VALID_ANSWERS = new Set(["A", "B", "C", "D", "E"]);

function validate(q, sectionId) {
  const errors = [];
  if (!VALID_SECTIONS.has(sectionId)) errors.push(`unknown section: ${sectionId}`);
  if (!Array.isArray(q.choices) || q.choices.length !== 5) errors.push("must have exactly 5 choices");
  else {
    const labels = q.choices.map((c) => c.label).sort().join("");
    if (labels !== "ABCDE") errors.push(`choice labels must be A-E, got: ${labels}`);
  }
  if (!VALID_ANSWERS.has(q.correct)) errors.push(`correct must be A-E, got: ${q.correct}`);
  if (!q.explanations || Object.keys(q.explanations).length !== 5) errors.push("must have 5 explanations");
  else {
    for (const l of ["A", "B", "C", "D", "E"]) {
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
    const errs = validate(q, sectionId);
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
