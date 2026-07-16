// Unit test: sanitizeQuestion strips the gated fields and nothing else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeQuestion } from '../src/lib/server/sanitize.js';

test('sanitizeQuestion strips correct_answer and explanations, keeps the rest', () => {
  const row = {
    id: 'lsat_lr_001',
    exam_id: 'lsat',
    section_id: 'lsat_lr',
    batch: 'L003',
    passage: null,
    use_prev_passage: false,
    sort_order: 1,
    stem: 'Which one of the following...?',
    choices: [{ label: 'A', text: '...' }],
    correct_answer: 'C',
    explanations: { A: 'wrong because...', C: 'right because...' },
    topic: 'Assumption',
    difficulty: 'Medium',
  };
  const safe = sanitizeQuestion(row);
  assert.ok(!('correct_answer' in safe), 'correct_answer leaked');
  assert.ok(!('explanations' in safe), 'explanations leaked');
  const { correct_answer, explanations, ...expected } = row;
  assert.deepEqual(safe, expected);
});
