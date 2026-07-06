const FORBIDDEN_PATTERNS = [
  /점수/g,
  /등급/g,
  /강점/g,
  /약점/g,
  /4축/g,
  /부족합니다/g,
  /약합니다/g,
  /잘못/g,
  /고치세요/g,
  /감정 전달력/g,
  /몰입도/g,
  /진정성/g,
  /실력/g
];

const UNKNOWN_PATTERNS = [/모르겠/, /잘 모르/, /애매/, /없음/, /^\s*$/];

function includesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text || ''));
}

function normalizeInput(input) {
  return {
    sceneSituation: String(input.sceneSituation || '').trim(),
    characterWants: String(input.characterWants || '').trim(),
    outwardAttitude: String(input.outwardAttitude || '').trim(),
    innerSubtext: String(input.innerSubtext || '').trim(),
    currentBlock: String(input.currentBlock || '').trim(),
    actorLevel: String(input.actorLevel || '').trim(),
    practiceTime: String(input.practiceTime || '10분').trim() || '10분'
  };
}

function selectPattern(input) {
  const joined = [input.sceneSituation, input.characterWants, input.outwardAttitude, input.innerSubtext, input.currentBlock].join(' ');

  const unknownCount = [input.characterWants, input.innerSubtext, input.currentBlock].filter((value) => includesAny(value, UNKNOWN_PATTERNS)).length;
  if (unknownCount >= 2) return 'narrowing';

  if (/설명|대사|말이|말처럼|설득/.test(joined)) return 'defense';
  if (/화|소리|따지|분노|몰아붙/.test(joined)) return 'recognition';
  if (/웃|밝|장난|괜찮은 척|숨기/.test(joined)) return 'mask';
  if (/몸|호흡|발성|목소리|굳/.test(joined)) return 'bodyReason';
  return 'objective';
}

const PATTERN_BUILDERS = {
  defense(input) {
    return {
      thoughtToFill: '상대를 설득하려는 말보다, 상대가 나를 붙잡거나 흔들까 봐 먼저 방어하는 마음을 채워보면 좋아요.',
      reason: `입력해준 장면에서는 인물이 ‘${input.characterWants || '상대의 특정 반응'}’라는 바람을 갖고 있고, 동시에 ‘${input.innerSubtext || '드러내고 싶지 않은 마음'}’도 안고 있어요. 특히 “${input.currentBlock}”라는 막힘은 말의 내용보다 말하기 직전의 방어가 아직 덜 구체화됐을 때 자주 생길 수 있어요. 오늘은 감정을 키우기보다, 상대의 반응을 피하려는 마음이 대사 앞에 먼저 서게 만드는 훈련이 맞아 보여요.`,
      trainingTitle: '붙잡힘을 피하는 방어 훈련',
      trainingSteps: [
        '대사를 시작하기 전, 상대가 내가 가장 피하고 싶은 반응을 보이는 장면을 10초간 떠올려보세요.',
        '그 반응을 피하기 위해 인물이 속으로 먼저 하는 말을 한 문장으로 적어보세요.',
        '그 문장을 속으로 붙잡은 채 첫 대사만 다시 해보고, 말이 설명이 아니라 방어에서 시작되는지 확인해보세요.'
      ],
      startingQuestion: '상대가 지금 당신을 붙잡는다면, 이 인물은 정확히 무엇을 빼앗긴다고 느끼나요?',
      closingQuestion: '다시 해봤을 때, 대사가 설명이 아니라 먼저 자신을 지키려는 말처럼 시작되는 순간이 있었나요?'
    };
  },
  recognition(input) {
    return {
      thoughtToFill: '화를 크게 내는 것보다, 이 인물이 상대에게 확인받고 싶은 한 문장을 먼저 채워보면 좋아요.',
      reason: `입력해준 막힘은 “${input.currentBlock}”예요. 이 경우에는 에너지를 더 세게 쓰기보다, 인물이 상대에게 어떤 인정을 받고 싶은지 좁혀보는 편이 장면을 단순하게 만들지 않을 수 있어요. 지금은 ${input.characterWants || '상대의 반응'}을 바라지만, 그 아래에는 ${input.innerSubtext || '건드려진 마음'}이 있을 가능성이 있어요. 오늘은 그 마음을 직접 설명하지 않고, 상대에게서 듣고 싶은 한마디를 찾는 훈련으로 시작해보면 좋아요.`,
      trainingTitle: '인정받고 싶은 한마디 찾기 훈련',
      trainingSteps: [
        '상대가 해주면 인물이 잠깐 멈출 것 같은 말을 세 문장 적어보세요.',
        '그중 가장 듣고 싶은 한 문장만 남기고, 나머지는 지워보세요.',
        '그 한 문장을 듣기 위해 첫 대사를 다시 해보고, 소리의 크기보다 말의 방향이 생기는지 확인해보세요.'
      ],
      startingQuestion: '상대가 어떤 한마디를 해주면, 이 인물은 더 몰아붙이지 않고 잠깐 멈출 수 있을까요?',
      closingQuestion: '다시 해봤을 때, 화가 단순히 커지는 대신 상대에게 요구하는 방향이 생겼나요?'
    };
  },
  mask(input) {
    return {
      thoughtToFill: '밝게 보이려는 행동보다, 들키면 안 되는 마음의 크기를 먼저 채워보면 좋아요.',
      reason: `입력에는 ${input.outwardAttitude || '겉으로 보이는 태도'}와 ${input.innerSubtext || '숨기고 싶은 마음'} 사이의 차이가 있어요. “${input.currentBlock}”라고 느껴진다면, 웃음이나 밝음 자체보다 그것으로 무엇을 숨기려 하는지가 더 필요할 수 있어요. 오늘은 표현을 바꾸기보다, 들켰을 때 벌어질 일을 구체화해서 겉태도가 왜 필요한지 확인해보면 좋아요.`,
      trainingTitle: '들키면 안 되는 이유 구체화 훈련',
      trainingSteps: [
        '지금 숨기고 있는 마음이 상대에게 들켰을 때 생길 수 있는 일을 세 가지 적어보세요.',
        '그중 인물이 가장 피하고 싶은 결과 하나를 고르세요.',
        '그 결과를 피하려고 밝게 행동한다고 생각하고 첫 대사 또는 첫 행동을 다시 해보세요.'
      ],
      startingQuestion: '지금 들키면, 이 인물은 무엇을 가장 잃게 된다고 느끼나요?',
      closingQuestion: '다시 해봤을 때, 밝음이 가벼운 상태가 아니라 숨기기 위한 행동처럼 느껴졌나요?'
    };
  },
  bodyReason(input) {
    return {
      thoughtToFill: '몸이나 소리를 바로 바꾸기보다, 이 말을 끝까지 밀어야 하는 이유를 먼저 채워보면 좋아요.',
      reason: `현재 막힘은 “${input.currentBlock}”예요. 기술적인 막힘처럼 느껴져도, 장면 안에서 말의 목적이 흐리면 몸과 소리가 같이 멈출 수 있어요. 입력을 보면 인물은 ${input.characterWants || '상대의 반응'}을 바라고 있어요. 오늘은 몸을 풀기보다, 이 말을 반드시 해야 하는 이유를 짧고 선명하게 만드는 훈련이 맞아 보여요.`,
      trainingTitle: '말을 끝까지 미는 이유 훈련',
      trainingSteps: [
        '첫 대사 전에 “이 말을 못 하면 나는 ___를 잃는다”를 채워보세요.',
        '빈칸에 들어갈 말을 세 개 써보고 가장 몸이 반응하는 하나를 고르세요.',
        '그 한 문장을 속으로 말한 뒤, 첫 대사를 다시 해보세요.'
      ],
      startingQuestion: '이 말을 끝까지 하지 못하면, 이 인물은 무엇을 잃는다고 느끼나요?',
      closingQuestion: '다시 해봤을 때, 몸이나 소리가 결과가 아니라 목적을 따라 움직이는 느낌이 있었나요?'
    };
  },
  narrowing(input) {
    return {
      thoughtToFill: '오늘은 정답을 정하기보다, 인물이 상대에게 바라는 반응을 하나로 좁히는 것부터 시작해보면 좋아요.',
      reason: '입력에 아직 모르는 부분이 많아서 특정 마음이나 의도를 단정하지 않는 편이 안전해요. 대신 지금은 장면 해석을 완성하려 하기보다, 상대가 어떤 반응을 해주길 바라는지 좁히는 훈련이 더 도움이 될 수 있어요. 목적이 조금만 선명해져도 대사와 행동이 어디로 가야 하는지 보기 쉬워져요.',
      trainingTitle: '원하는 반응 좁히기 훈련',
      trainingSteps: [
        '상대가 해줄 수 있는 반응을 세 가지 적어보세요.',
        '그중 이 인물이 가장 바라지 않는 반응 하나를 지워보세요.',
        '남은 반응 중 하나를 얻기 위해 첫 대사를 다시 해보세요.'
      ],
      startingQuestion: '이 인물은 상대가 어떤 반응을 해주면 가장 안심할까요?',
      closingQuestion: '다시 해봤을 때, 첫 대사가 감정 표현보다 상대의 반응을 기다리는 말처럼 느껴졌나요?'
    };
  },
  objective(input) {
    return {
      thoughtToFill: '오늘은 감정을 먼저 정하기보다, 상대에게 실제로 일으키고 싶은 변화를 하나로 좁혀보면 좋아요.',
      reason: `입력해준 장면에서는 ${input.sceneSituation || '상황'} 안에서 인물이 ${input.characterWants || '무언가'}를 바라고 있어요. 그런데 막힘이 “${input.currentBlock}”라면, 지금은 감정의 종류보다 상대가 어떻게 변하길 바라는지가 더 필요할 수 있어요. 오늘은 상대에게 일어나야 하는 변화 하나를 정하고, 그 변화를 향해 대사를 다시 보내보는 훈련으로 시작해보면 좋아요.`,
      trainingTitle: '상대의 변화 한 가지 정하기 훈련',
      trainingSteps: [
        '상대가 장면 끝에 어떻게 달라져 있기를 바라는지 세 가지로 적어보세요.',
        '그중 지금 첫 대사로 가장 먼저 흔들 수 있는 변화 하나를 고르세요.',
        '그 변화를 일으키려는 말이라고 생각하고 첫 대사를 다시 해보세요.'
      ],
      startingQuestion: '이 장면에서 당신은 상대가 어떤 선택이나 반응을 하게 만들고 싶나요?',
      closingQuestion: '다시 해봤을 때, 대사가 감정을 보여주는 말이 아니라 상대를 움직이려는 말처럼 느껴졌나요?'
    };
  }
};

export function generateTraining(rawInput) {
  const input = normalizeInput(rawInput);
  const pattern = selectPattern(input);
  const result = PATTERN_BUILDERS[pattern](input);
  return {
    ...result,
    cta: '이 훈련을 실제 영상으로 해보면, acttub이 어느 순간에서 생각이 비는지 더 정확히 질문해줄 수 있어요.',
    pattern,
    createdAt: new Date().toISOString()
  };
}

export function validateTrainingResult(result) {
  const text = [
    result.thoughtToFill,
    result.reason,
    result.trainingTitle,
    ...(result.trainingSteps || []),
    result.startingQuestion,
    result.closingQuestion,
    result.cta
  ].join('\n');
  const forbiddenMatches = FORBIDDEN_PATTERNS.flatMap((pattern) => text.match(pattern) || []);
  return {
    valid:
      Boolean(result.thoughtToFill) &&
      Boolean(result.reason) &&
      Boolean(result.trainingTitle) &&
      Array.isArray(result.trainingSteps) &&
      result.trainingSteps.length === 3 &&
      Boolean(result.startingQuestion) &&
      Boolean(result.closingQuestion) &&
      forbiddenMatches.length === 0,
    forbiddenMatches
  };
}

export function copyForShare(result) {
  return `오늘의 연기질문\n\n“${result.startingQuestion}”\n\nacttub\n배우가 스스로 장면을 다시 보게 하는 질문`;
}

export const fieldDefinitions = [
  {
    name: 'sceneSituation',
    label: '장면 상황',
    question: '지금 장면에서 무슨 일이 벌어지고 있나요?',
    placeholder: '예: 오래 사귄 친구에게 사실은 떠나고 싶다고 말해야 하는 장면',
    required: true
  },
  {
    name: 'characterWants',
    label: '인물이 원하는 것',
    question: '이 인물은 상대에게 무엇을 얻고 싶나요?',
    placeholder: '예: 상대가 나를 붙잡지 않았으면 좋겠다',
    required: true
  },
  {
    name: 'outwardAttitude',
    label: '겉태도',
    question: '겉으로는 어떤 태도를 보이나요?',
    placeholder: '예: 괜찮은 척, 차분한 척한다',
    required: true
  },
  {
    name: 'innerSubtext',
    label: '속마음',
    question: '사실 속으로는 무엇을 느끼거나 숨기고 있나요?',
    placeholder: '예: 미안하고 무섭지만 들키고 싶지 않다',
    required: true
  },
  {
    name: 'currentBlock',
    label: '오늘 막히는 부분',
    question: '오늘 연습하면서 어디가 제일 막히나요?',
    placeholder: '예: 대사가 자꾸 설명처럼 느껴진다',
    required: true
  }
];
