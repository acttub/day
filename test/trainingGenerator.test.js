import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONDITION_OPTIONS,
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

test('daily recommendation is deterministic for the same date and condition', () => {
  const first = generateTraining({ date: '2026-07-06', conditionId: 'body-stiff' });
  const again = generateTraining({ date: '2026-07-06', conditionId: 'body-stiff' });
  const otherCondition = generateTraining({ date: '2026-07-06', conditionId: 'mind-scattered' });

  assert.equal(first.id, again.id);
  assert.notEqual(first.condition.id, otherCondition.condition.id);
  assert.equal(getDailySeed('2026-07-06', 'body-stiff'), getDailySeed('2026-07-06', 'body-stiff'));
});

test('condition options exist and map to actor-training categories', () => {
  assert.ok(CONDITION_OPTIONS.length >= 6);
  for (const condition of CONDITION_OPTIONS) {
    assert.equal(typeof condition.label, 'string');
    assert.equal(typeof condition.description, 'string');
    assert.ok(Array.isArray(condition.preferredCategories));
    assert.ok(condition.preferredCategories.every((category) => ALLOWED_CATEGORIES.includes(category)));
  }
});

test('training library recommends only actor training categories, not scene work', () => {
  assert.ok(TRAINING_LIBRARY.length >= 20);

  for (const training of TRAINING_LIBRARY) {
    assert.ok(ALLOWED_CATEGORIES.includes(training.category), `${training.id} has category ${training.category}`);
    assert.doesNotMatch(training.id, /scene/);
    assert.doesNotMatch(allText(training), /장면|대사|인물|상대에게|영상|acttub 질문|질문 대화/);
  }
});

test('each actor training is detailed enough to execute and understand', () => {
  for (const training of TRAINING_LIBRARY) {
    const result = generateTraining({ date: '2026-07-06', conditionId: 'just-random' });
    assert.equal(typeof training.title, 'string');
    assert.ok(training.summary.length >= 20);
    assert.equal(training.timeline.length, 4);
    assert.ok(training.timeline.every((step) => /분/.test(step.time) && step.instruction.length >= 25));
    assert.ok(training.coachingTips.length >= 3);
    assert.ok(training.closingCheck.length >= 2);
    assert.ok(result.guide.whatIsIt.length >= 30);
    assert.ok(result.guide.bestFor.length >= 3);
    assert.ok(result.guide.watchFor.length >= 3);
    assert.ok(result.guide.commonMistake.length >= 30);
  }
});

test('condition-based recommendation uses the preferred category pool', () => {
  for (const condition of CONDITION_OPTIONS.filter((item) => item.preferredCategories.length)) {
    const result = generateTraining({ date: '2026-07-06', conditionId: condition.id });
    assert.ok(condition.preferredCategories.includes(result.category), `${condition.id} recommended ${result.category}`);
  }
});

test('generated result presents a proper actor training guide only', () => {
  const result = generateTraining({ date: '2026-07-06', conditionId: 'mind-scattered' });

  assert.equal(typeof result.title, 'string');
  assert.ok(ALLOWED_CATEGORIES.includes(result.category));
  assert.equal(result.timeline.length, 4);
  assert.ok(result.coachingTips.length >= 3);
  assert.ok(result.closingCheck.length >= 2);
  assert.match(result.heroLine, /오늘 10분/);
  assert.ok(result.guide.whatIsIt);
  assert.ok(result.guide.bestFor.length >= 3);
  assert.ok(result.guide.watchFor.length >= 3);
  assert.doesNotMatch(allText(result), /오늘 채울 생각|왜 이 훈련인가|장면|대사|영상|질문 대화/);
});

test('does not use evaluative, scoring, or non-scope language', () => {
  const result = generateTraining({ date: '2026-07-06', conditionId: 'body-stiff' });
  const validation = validateTrainingResult(result);

  assert.deepEqual(validation.forbiddenMatches, []);
  assert.deepEqual(validation.actorTrainingOnlyMatches, []);
  assert.equal(validation.valid, true);
});

test('share copy is concise and only shares the actor training', () => {
  const result = generateTraining({ date: '2026-07-06', conditionId: 'mind-scattered' });
  const share = copyForShare(result);

  assert.match(share, /오늘의 배우훈련/);
  assert.ok(share.includes(result.title));
  assert.match(share, /10분/);
  assert.doesNotMatch(share, /장면|대사|영상|속마음/);
});
