import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTraining, getPracticeStepState } from '../src/trainingGenerator.js';

test('practice guide exposes the current 10-minute step with progress labels', () => {
  const result = generateTraining({ date: '2026-07-06', conditionId: 'mind-scattered' });
  const state = getPracticeStepState(result, 0);

  assert.equal(state.currentIndex, 0);
  assert.equal(state.totalSteps, 4);
  assert.equal(state.progressLabel, '1/4');
  assert.equal(state.isFirst, true);
  assert.equal(state.isLast, false);
  assert.match(state.title, /0~2분/);
  assert.equal(state.step.time, result.timeline[0].time);
  assert.equal(state.nextActionLabel, '다음 단계로');
});

test('practice guide clamps invalid step indexes and marks the last step', () => {
  const result = generateTraining({ date: '2026-07-06', conditionId: 'body-stiff' });
  const negative = getPracticeStepState(result, -10);
  const overflow = getPracticeStepState(result, 99);

  assert.equal(negative.currentIndex, 0);
  assert.equal(overflow.currentIndex, 3);
  assert.equal(overflow.progressLabel, '4/4');
  assert.equal(overflow.isLast, true);
  assert.equal(overflow.nextActionLabel, '기록 남기기');
});

test('practice guide provides a short focus hint for each step', () => {
  const result = generateTraining({ date: '2026-07-06', conditionId: 'reaction-dull' });

  for (let index = 0; index < result.timeline.length; index += 1) {
    const state = getPracticeStepState(result, index);
    assert.ok(state.hint.length >= 10);
    assert.doesNotMatch(state.hint, /점수|등급|강점|약점|평가|장면|영상/);
  }
});
