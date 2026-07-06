import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAINING_LIBRARY,
  copyForShare,
  generateTraining,
  getDailySeed,
  validateTrainingResult
} from '../src/trainingGenerator.js';

test('daily recommendation is deterministic for the same date and changes across dates', () => {
  const first = generateTraining({ date: '2026-07-06' });
  const again = generateTraining({ date: '2026-07-06' });
  const nextDay = generateTraining({ date: '2026-07-07' });

  assert.equal(first.id, again.id);
  assert.notEqual(first.id, nextDay.id);
  assert.equal(getDailySeed('2026-07-06'), getDailySeed('2026-07-06'));
});

test('training library is broad enough and includes detailed 10 minute exercises', () => {
  assert.ok(TRAINING_LIBRARY.length >= 20);

  for (const training of TRAINING_LIBRARY) {
    assert.equal(typeof training.title, 'string');
    assert.ok(training.title.length >= 3);
    assert.ok(['장면', '마이즈너 영감', '뷰포인트 영감', '감각/관찰', '호흡/집중'].includes(training.category));
    assert.ok(training.summary.length >= 20);
    assert.equal(training.timeline.length, 4);
    assert.ok(training.timeline.every((step) => /분/.test(step.time) && step.instruction.length >= 25));
    assert.ok(training.coachingTips.length >= 3);
    assert.ok(training.closingCheck.length >= 2);
  }
});

test('generated result presents a random daily acting training, not scene diagnosis', () => {
  const result = generateTraining({ date: '2026-07-06' });

  assert.equal(typeof result.title, 'string');
  assert.equal(typeof result.category, 'string');
  assert.equal(result.timeline.length, 4);
  assert.ok(result.coachingTips.length >= 3);
  assert.ok(result.closingCheck.length >= 2);
  assert.match(result.heroLine, /오늘 10분/);
  assert.doesNotMatch(JSON.stringify(result), /오늘 채울 생각|왜 이 훈련인가|장면에서 가장/);
});

test('does not use evaluative or scoring language', () => {
  const result = generateTraining({ date: '2026-07-06' });
  const validation = validateTrainingResult(result);

  assert.deepEqual(validation.forbiddenMatches, []);
  assert.equal(validation.valid, true);
});

test('share copy is concise and does not expose private scene context', () => {
  const result = generateTraining({ date: '2026-07-06' });
  const share = copyForShare(result);

  assert.match(share, /오늘의 연기 훈련/);
  assert.ok(share.includes(result.title));
  assert.match(share, /10분/);
  assert.match(share, /acttub/);
  assert.doesNotMatch(share, /오래 사귄 친구|떠나고 싶다고|속마음/);
});
