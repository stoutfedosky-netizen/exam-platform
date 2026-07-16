// Passage-group-aware selection, ported from mcat-mastery examData.selectQuestions.
// Pure function (no Next.js/Supabase imports) so it stays unit-testable in plain node.
//
// Rows are grouped into passage sets: a row carrying `passage` starts a group,
// and subsequent rows stay in it while they share the head's batch + section_id.
// Whole groups are shuffled, then accumulated (never split) up to `count`,
// preserving intra-group order.
export function selectWithPassageGroups(pool, count) {
  if (count >= pool.length) return pool;

  const groups = [];
  let current = [];
  for (const q of pool) {
    if (q.passage) {
      if (current.length) groups.push(current);
      current = [q];
    } else if (current.length > 0 && q.batch === current[0].batch && q.section_id === current[0].section_id) {
      current.push(q);
    } else {
      if (current.length) groups.push(current);
      current = [q];
    }
  }
  if (current.length) groups.push(current);

  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }

  const selected = [];
  for (const group of groups) {
    if (selected.length >= count) break;
    if (selected.length + group.length <= count) {
      selected.push(...group);
    }
  }

  return selected;
}
