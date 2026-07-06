import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAINING_LIBRARY,
  copyForShare,
  generateTraining,
  getDailySeed,
  validateTrainingResult
} from '../src/trainingGenerator.js';

const ALLOWED_CATEGORIES = ['마이즈너 영감', '뷰포인트 영감', '감각/관찰', '호흡/집중', '즉흥/상상'];

function allText(value) {
  return JSON.stringify(value);
}

test('daily recommendation is deterministic for the same date and changes across dates', () => {
  const first = generateTraining({ date: '2026-07-06' });
  const again = generateTraining({ date: '2026-07-06' });
  const nextDay = generateTraining({ date: '2026-07-07' });

  assert.equal(first.id, again.id);
  assert.notEqual(first.id, nextDay.id);
  assert.equal(getDailySeed('2026-07-06'), getDailySeed('2026-07-06'));
});

test('training library recommends only actor training categories, not scene work', () => {
  assert.ok(TRAINING_LIBRARY.length >= 20);

  for (const training of TRAINING_LIBRARY) {
    assert.ok(ALLOWED_CATEGORIES.includes(training.category), `${training.id} has category ${training.category}`);
    assert.doesNotMatch(training.id, /scene/);
    assert.doesNotMatch(allText(training), /장면|대사|인물|상대에게|영상|acttub 질문/);
  }
});

test('each actor training is detailed enough to execute for 10 minutes', () => {
  for (const training of TRAINING_LIBRARY) {
    assert.equal(typeof training.title, 'string');
    assert.ok(training.summary.length >= 20);
    assert.equal(training.timeline.length, 4);
    assert.ok(training.timeline.every((step) => /분/.test(step.time) && step.instruction.length >= 25));
    assert.ok(training.coachingTips.length >= 3);
    assert.ok(training.closingCheck.length >= 2);
  }
});

test('generated result presents a random daily actor training only', () => {
  const result = generateTraining({ date: '2026-07-06' });

  assert.equal(typeof result.title, 'string');
  assert.ok(ALLOWED_CATEGORIES.includes(result.category));
  assert.equal(result.timeline.length, 4);
  assert.ok(result.coachingTips.length >= 3);
  assert.ok(result.closingCheck.length >= 2);
  assert.match(result.heroLine, /오늘 10분/);
  assert.doesNotMatch(allText(result), /오늘 채울 생각|왜 이 훈련인가|장면|대사|영상|질문 대화/);
});

test('does not use evaluative or scoring language', () => {
  const result = generateTraining({ date: '2026-07-06' });
  const validation = validateTrainingResult(result);

  assert.deepEqual(validation.forbiddenMatches, []);
  assert.equal(validation.valid, true);
});

test('share copy is concise and only shares the actor training', () => {
  const result = generateTraining({ date: '2026-07-06' });
  const share = copyForShare(result);

  assert.match(share, /오늘의 배우훈련/);
  assert.ok(share.includes(result.title));
  assert.match(share, /10분/);
  assert.doesNotMatch(share, /장면|대사|영상|속마음/);
});
