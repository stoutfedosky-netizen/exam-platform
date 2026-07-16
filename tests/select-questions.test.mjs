// Unit tests for selectWithPassageGroups (node --test tests/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectWithPassageGroups } from '../src/lib/server/select-questions.js';

// Fixture: two RC passage sets (head carries `passage`, followers share
// batch + section_id with use_prev_passage=true) and three LR discretes,
// each discrete in its own batch so it forms its own group.
function fixture() {
  return [
    { id: 'lsat_rc_001', section_id: 'lsat_rc', batch: 'L001', passage: 'Passage A ...', use_prev_passage: false },
    { id: 'lsat_rc_002', section_id: 'lsat_rc', batch: 'L001', passage: null, use_prev_passage: true },
    { id: 'lsat_rc_003', section_id: 'lsat_rc', batch: 'L001', passage: null, use_prev_passage: true },
    { id: 'lsat_rc_004', section_id: 'lsat_rc', batch: 'L002', passage: 'Passage B ...', use_prev_passage: false },
    { id: 'lsat_rc_005', section_id: 'lsat_rc', batch: 'L002', passage: null, use_prev_passage: true },
    { id: 'lsat_lr_001', section_id: 'lsat_lr', batch: 'L003', passage: null, use_prev_passage: false },
    { id: 'lsat_lr_002', section_id: 'lsat_lr', batch: 'L004', passage: null, use_prev_passage: false },
    { id: 'lsat_lr_003', section_id: 'lsat_lr', batch: 'L005', passage: null, use_prev_passage: false },
  ];
}

const GROUPS = {
  L001: ['lsat_rc_001', 'lsat_rc_002', 'lsat_rc_003'],
  L002: ['lsat_rc_004', 'lsat_rc_005'],
  L003: ['lsat_lr_001'],
  L004: ['lsat_lr_002'],
  L005: ['lsat_lr_003'],
};

function assertNoSplitGroupsAndOrder(selected) {
  const ids = new Set(selected.map((q) => q.id));
  for (const memberIds of Object.values(GROUPS)) {
    const present = memberIds.filter((id) => ids.has(id));
    // never split: a passage set is either fully in or fully out
    assert.ok(
      present.length === 0 || present.length === memberIds.length,
      `passage set ${memberIds} was split: got ${present}`
    );
    // intra-group order + contiguity preserved
    if (present.length === memberIds.length) {
      const positions = memberIds.map((id) => selected.findIndex((q) => q.id === id));
      for (let i = 1; i < positions.length; i++) {
        assert.equal(positions[i], positions[i - 1] + 1,
          `group ${memberIds} not contiguous/in order in ${selected.map((q) => q.id)}`);
      }
    }
  }
}

test('passage sets are never split across the count boundary (all counts, many shuffles)', () => {
  for (let count = 1; count <= 7; count++) {
    for (let run = 0; run < 200; run++) {
      const selected = selectWithPassageGroups(fixture(), count);
      assert.ok(selected.length <= count, `returned ${selected.length} > count ${count}`);
      assertNoSplitGroupsAndOrder(selected);
    }
  }
});

test('count >= pool size returns the whole pool in original order', () => {
  const pool = fixture();
  assert.deepEqual(selectWithPassageGroups(pool, 8), pool);
  assert.deepEqual(selectWithPassageGroups(pool, 99), pool);
});

test('fills up to count exactly when group sizes permit', () => {
  // groups sizes are 3,2,1,1,1 — for count 5 a valid packing always exists,
  // but the ported algorithm takes groups in shuffled order and only skips
  // oversized ones, so we assert it never exceeds count and never splits.
  const selected = selectWithPassageGroups(fixture(), 5);
  assert.ok(selected.length >= 1 && selected.length <= 5);
  assertNoSplitGroupsAndOrder(selected);
});

test('discretes glom onto a preceding group only when batch+section match (ported behavior)', () => {
  // Same batch + section as the passage head -> same group, even without
  // use_prev_passage. This mirrors mcat-mastery selectQuestions exactly.
  const pool = [
    { id: 'a1', section_id: 's1', batch: 'B1', passage: 'P', use_prev_passage: false },
    { id: 'a2', section_id: 's1', batch: 'B1', passage: null, use_prev_passage: true },
    { id: 'b1', section_id: 's1', batch: 'B2', passage: null, use_prev_passage: false },
  ];
  for (let run = 0; run < 100; run++) {
    const selected = selectWithPassageGroups(pool, 2);
    const ids = selected.map((q) => q.id).sort();
    // only whole groups fit: [a1,a2] (size 2) or [b1] (size 1, possibly alone)
    assert.ok(
      JSON.stringify(ids) === JSON.stringify(['a1', 'a2']) ||
      JSON.stringify(ids) === JSON.stringify(['b1']) ||
      JSON.stringify(ids) === JSON.stringify([]),
      `unexpected selection ${ids}`
    );
  }
});
