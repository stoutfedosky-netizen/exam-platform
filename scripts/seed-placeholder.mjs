// Inserts throwaway placeholder LSAT content for end-to-end testing.
// All rows tagged batch='PLACEHOLDER' for easy cleanup:
//   delete from questions where batch = 'PLACEHOLDER'
//
//   node scripts/seed-placeholder.mjs
//
// Idempotent: upserts on question id.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const questions = [
  // ── 3 Logical Reasoning discretes ──
  {
    id: "lsat_lr_ph_001",
    exam_id: "lsat",
    section_id: "lsat_lr",
    batch: "PLACEHOLDER",
    sort_order: 1,
    passage: "A recent study found that cities with more public parks have lower rates of reported stress among residents. The study controlled for income levels and population density.",
    use_prev_passage: false,
    stem: "Which one of the following, if true, most weakens the argument that public parks reduce stress?",
    choices: [
      { label: "A", text: "Cities with lower stress rates tend to attract more funding for public amenities, including parks." },
      { label: "B", text: "Some residents of cities with many parks report that they never visit them." },
      { label: "C", text: "The study was conducted during summer months when park usage is highest." },
      { label: "D", text: "Stress reduction techniques other than park visits are widely available." },
    ],
    correct_answer: "A",
    explanations: {
      A: "Correct. This suggests reverse causation: low stress leads to more parks, not the other way around. The argument assumes parks cause lower stress, but this choice shows the causal arrow may point in the opposite direction.",
      B: "Weakens slightly, but doesn't address the overall correlation found in the study.",
      C: "This could affect the magnitude of the effect but doesn't challenge the causal claim itself.",
      D: "The availability of alternatives doesn't undermine the claim that parks also reduce stress.",
    },
    topic: "Weaken",
    difficulty: "Medium",
  },
  {
    id: "lsat_lr_ph_002",
    exam_id: "lsat",
    section_id: "lsat_lr",
    batch: "PLACEHOLDER",
    sort_order: 2,
    passage: "All licensed therapists in this state must complete 40 hours of continuing education every two years. Jordan has not completed any continuing education hours this cycle. Therefore, Jordan's license will not be renewed.",
    use_prev_passage: false,
    stem: "The reasoning in the argument is most vulnerable to criticism on the grounds that it:",
    choices: [
      { label: "A", text: "fails to consider that Jordan may not be a licensed therapist." },
      { label: "B", text: "assumes that the continuing education requirement has no exceptions." },
      { label: "C", text: "overlooks the possibility that Jordan completed education last cycle." },
      { label: "D", text: "treats a necessary condition for renewal as if it were sufficient." },
    ],
    correct_answer: "A",
    explanations: {
      A: "Correct. The argument assumes Jordan is a licensed therapist, but this is never stated. If Jordan is not a licensed therapist, the requirement does not apply.",
      B: "While possible, the argument's primary flaw is the unstated assumption about Jordan's profession.",
      C: "Previous cycle completion is irrelevant; the requirement is per-cycle.",
      D: "The argument treats CE as necessary for renewal, which is how the rule works. The flaw is about the unstated premise.",
    },
    topic: "Flaw",
    difficulty: "Easy",
  },
  {
    id: "lsat_lr_ph_003",
    exam_id: "lsat",
    section_id: "lsat_lr",
    batch: "PLACEHOLDER",
    sort_order: 3,
    passage: "Editorial: The city council argues that raising parking meter rates will reduce downtown congestion. But higher rates will simply push drivers to circle blocks looking for cheaper spots, increasing traffic. Moreover, shoppers who would have driven downtown will go to suburban malls instead, harming local businesses.",
    use_prev_passage: false,
    stem: "Which one of the following most accurately describes the role played in the editorial's argument by the claim that shoppers will go to suburban malls?",
    choices: [
      { label: "A", text: "It is the main conclusion of the editorial's argument." },
      { label: "B", text: "It is a premise offered in support of an intermediate conclusion." },
      { label: "C", text: "It is an additional consideration supporting the editorial's overall position against the rate increase." },
      { label: "D", text: "It is a concession to the city council's position." },
    ],
    correct_answer: "C",
    explanations: {
      A: "The main conclusion is that the rate increase is a bad idea, not this specific claim.",
      B: "The claim is not supporting an intermediate conclusion; it is an independent supporting reason.",
      C: "Correct. The editorial argues against the rate increase. The mall claim is a second, independent reason (beyond congestion) why the increase is harmful.",
      D: "This claim opposes the council's position rather than conceding anything to it.",
    },
    topic: "Method of Reasoning",
    difficulty: "Hard",
  },

  // ── 1 RC passage set (head + 3 followers) ──
  {
    id: "lsat_rc_ph_001",
    exam_id: "lsat",
    section_id: "lsat_rc",
    batch: "PLACEHOLDER",
    sort_order: 1,
    passage: "The doctrine of judicial review — the power of courts to invalidate legislation that conflicts with a constitution — is often traced to Marbury v. Madison (1803). Yet this genealogy obscures a richer and more contested history. In England, Sir Edward Coke argued in Dr. Bonham's Case (1610) that the common law could override an act of Parliament, a position that Parliament itself emphatically rejected through the doctrine of parliamentary sovereignty. Colonial American courts, operating under royal charters that functioned as quasi-constitutions, occasionally voided local statutes that conflicted with charter provisions well before independence.\n\nAfter the Revolution, state courts began striking down legislation on constitutional grounds with increasing frequency. In Trevett v. Weeden (1786), a Rhode Island court refused to enforce a statute requiring acceptance of paper money, holding it inconsistent with the state's charter and unwritten fundamental law. Similar decisions in Virginia and North Carolina preceded the Constitutional Convention by several years.\n\nThe framers of the U.S. Constitution were well aware of these precedents. Alexander Hamilton, in Federalist No. 78, provided the intellectual framework that Marshall would later adopt: because the Constitution is a \"fundamental law\" superior to ordinary legislation, judges must prefer the Constitution when the two conflict. Hamilton's argument was not uncontroversial, however. Anti-Federalists objected that giving unelected judges the power to nullify legislation would create an aristocratic branch accountable to no one.\n\nMarshall's contribution in Marbury was therefore not the invention of judicial review but its consolidation at the federal level and its grounding in the text and structure of the written Constitution rather than in common-law principles or natural rights. By framing the question as one of textual interpretation rather than abstract principle, Marshall made the practice far more defensible — and far harder to dislodge.",
    use_prev_passage: false,
    stem: "Which one of the following most accurately expresses the main point of the passage?",
    choices: [
      { label: "A", text: "Judicial review was practiced in various forms before Marbury v. Madison, and Marshall's achievement was to consolidate and ground the practice in constitutional text rather than to invent it." },
      { label: "B", text: "The doctrine of judicial review originated in English common law and was imported into American jurisprudence by colonial courts." },
      { label: "C", text: "Hamilton's argument in Federalist No. 78 was the true origin of judicial review, and Marshall merely adopted it." },
      { label: "D", text: "Anti-Federalist objections to judicial review were ultimately vindicated by the practice's development after Marbury." },
    ],
    correct_answer: "A",
    explanations: {
      A: "Correct. The passage traces judicial review's pre-Marbury history and concludes that Marshall's contribution was consolidation and textual grounding, not invention.",
      B: "Too narrow. The passage mentions Coke's position but notes Parliament rejected it; colonial courts acted under different authority than English common law.",
      C: "The passage presents Hamilton as influential but not as the sole origin; Marshall made an independent contribution by grounding review in constitutional text.",
      D: "The passage mentions anti-Federalist objections but does not claim they were vindicated.",
    },
    topic: "Main Point",
    difficulty: "Medium",
  },
  {
    id: "lsat_rc_ph_002",
    exam_id: "lsat",
    section_id: "lsat_rc",
    batch: "PLACEHOLDER",
    sort_order: 2,
    use_prev_passage: true,
    stem: "According to the passage, which of the following is true of Trevett v. Weeden?",
    choices: [
      { label: "A", text: "It was the first case in which an American court struck down a statute on constitutional grounds." },
      { label: "B", text: "A court refused to enforce a statute on the basis that it conflicted with fundamental law." },
      { label: "C", text: "It directly influenced the drafting of Article III of the Constitution." },
      { label: "D", text: "It established the principle of parliamentary sovereignty in American law." },
    ],
    correct_answer: "B",
    explanations: {
      A: "The passage does not claim it was the first such case, only that it is one example among others.",
      B: "Correct. The passage states the court 'refused to enforce a statute requiring acceptance of paper money, holding it inconsistent with the state's charter and unwritten fundamental law.'",
      C: "The passage does not mention Article III or claim a direct connection to its drafting.",
      D: "Parliamentary sovereignty is described as an English doctrine that rejected judicial review.",
    },
    topic: "Detail",
    difficulty: "Easy",
  },
  {
    id: "lsat_rc_ph_003",
    exam_id: "lsat",
    section_id: "lsat_rc",
    batch: "PLACEHOLDER",
    sort_order: 3,
    use_prev_passage: true,
    stem: "The passage mentions the Anti-Federalists' objection primarily in order to:",
    choices: [
      { label: "A", text: "demonstrate that Hamilton's argument was fatally flawed." },
      { label: "B", text: "show that the concept of judicial review was controversial even before Marbury." },
      { label: "C", text: "argue that unelected judges should not have the power to nullify legislation." },
      { label: "D", text: "explain why Marshall chose to ground his argument in constitutional text." },
    ],
    correct_answer: "B",
    explanations: {
      A: "The passage does not endorse the anti-Federalist objection as fatal to Hamilton's argument.",
      B: "Correct. The mention of anti-Federalist objections illustrates that judicial review was debated and contested before Marshall's opinion in Marbury.",
      C: "The passage reports this as the anti-Federalist position, but does not adopt it as its own argument.",
      D: "While Marshall's textual approach may have been responsive to such objections, the passage does not draw this explicit connection.",
    },
    topic: "Function",
    difficulty: "Medium",
  },
  {
    id: "lsat_rc_ph_004",
    exam_id: "lsat",
    section_id: "lsat_rc",
    batch: "PLACEHOLDER",
    sort_order: 4,
    use_prev_passage: true,
    stem: "The author's attitude toward Marshall's contribution in Marbury v. Madison can best be described as:",
    choices: [
      { label: "A", text: "dismissive, viewing it as merely derivative of earlier precedents." },
      { label: "B", text: "appreciative, acknowledging its significance while correcting the common overstatement of its originality." },
      { label: "C", text: "neutral, presenting the facts without evaluating Marshall's achievement." },
      { label: "D", text: "critical, arguing that Marshall's textual approach was less principled than earlier common-law reasoning." },
    ],
    correct_answer: "B",
    explanations: {
      A: "The author credits Marshall with consolidation and a defensible textual grounding, which is not dismissive.",
      B: "Correct. The author describes Marshall's contribution as making the practice 'far more defensible' while arguing it was consolidation rather than invention.",
      C: "The author does evaluate Marshall's contribution positively ('far more defensible — and far harder to dislodge'), so this is not purely neutral.",
      D: "The author presents Marshall's textual approach favorably, not critically.",
    },
    topic: "Attitude",
    difficulty: "Hard",
  },
];

const { data, error } = await admin.from("questions").upsert(questions, { onConflict: "id" });
if (error) {
  console.error("FAIL:", error.message);
  process.exit(1);
}

console.log(`OK  Inserted ${questions.length} placeholder questions (batch=PLACEHOLDER)`);
console.log("    3 LR discretes:  lsat_lr_ph_001..003");
console.log("    1 RC passage set: lsat_rc_ph_001 (head) + 002..004 (followers)");
console.log("");
console.log("To remove:  delete from questions where batch = 'PLACEHOLDER'");
console.log("   or run:  node -e \"...\"`  (see script comments)");
