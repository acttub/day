import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTraining, validateTrainingResult, copyForShare } from '../src/trainingGenerator.js';

const baseInput = {
  sceneSituation: '오래 사귄 친구에게 사실은 떠나고 싶다고 말해야 하는 장면',
  characterWants: '상대가 나를 붙잡지 않았으면 좋겠다',
  outwardAttitude: '괜찮은 척, 차분한 척한다',
  innerSubtext: '미안하고 무섭지만 들키고 싶지 않다',
  currentBlock: '대사가 자꾸 설명처럼 느껴진다',
  actorLevel: '입시 준비',
  practiceTime: '10분'
};

test('generates the required training contract from scene context', () => {
  const result = generateTraining(baseInput);

  assert.equal(typeof result.thoughtToFill, 'string');
  assert.ok(result.thoughtToFill.length > 15);
  assert.equal(typeof result.reason, 'string');
  assert.equal(typeof result.trainingTitle, 'string');
  assert.equal(result.trainingSteps.length, 3);
  assert.equal(typeof result.startingQuestion, 'string');
  assert.equal(typeof result.closingQuestion, 'string');
  assert.match(result.cta, /영상/);
  assert.match(result.cta, /질문/);
});

test('grounds the recommendation in the user input without pretending to see video', () => {
  const result = generateTraining(baseInput);
  const text = Object.values(result).flat().join('\n');

  assert.match(text, /붙잡|방어|설명|상대/);
  assert.doesNotMatch(text, /00:\d\d|타임스탬프|표정이|말투가|몸짓이|보입니다/);
});

test('does not use evaluative or scoring language', () => {
  const result = generateTraining(baseInput);
  const validation = validateTrainingResult(result);

  assert.deepEqual(validation.forbiddenMatches, []);
  assert.equal(validation.valid, true);
});

test('handles unknown intent by choosing a narrowing-question exercise instead of guessing', () => {
  const result = generateTraining({
    sceneSituation: '친구와 말다툼하는 장면',
    characterWants: '잘 모르겠다',
    outwardAttitude: '화난 것 같다',
    innerSubtext: '잘 모르겠다',
    currentBlock: '뭘 원하는지 모르겠다',
    actorLevel: '입시 준비',
    practiceTime: '10분'
  });

  assert.match(result.trainingTitle, /좁히|찾기|원하는/);
  assert.match(result.startingQuestion, /어떤 반응|무엇을 바라는|원하/);
  assert.doesNotMatch(result.reason, /사실은 .* 싶어/);
});

test('share copy exposes the question and brand without leaking private scene context', () => {
  const result = generateTraining(baseInput);
  const share = copyForShare(result);

  assert.match(share, /오늘의 연기질문/);
  assert.ok(share.includes(result.startingQuestion));
  assert.match(share, /acttub/);
  assert.doesNotMatch(share, /오래 사귄 친구|떠나고 싶다고/);
});
