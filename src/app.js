import { CONDITION_OPTIONS, copyForShare, generateTraining, getPracticeStepState, validateTrainingResult } from './trainingGenerator.js';

const app = document.querySelector('#app');
const state = {
  step: 'landing',
  selectedConditionId: loadSelectedCondition(),
  result: generateTraining({ conditionId: loadSelectedCondition() }),
  practiceStepIndex: 0,
  history: loadHistory(),
  survey: {}
};

const analytics = loadAnalytics();

function loadSelectedCondition() {
  return localStorage.getItem('dailyTrainingCondition') || 'just-random';
}

function loadAnalytics() {
  try {
    return JSON.parse(localStorage.getItem('dailyTrainingAnalytics') || '[]');
  } catch {
    return [];
  }
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('dailyTrainingHistory') || '[]');
  } catch {
    return [];
  }
}

function track(event, properties = {}) {
  analytics.push({ event, properties, at: new Date().toISOString() });
  localStorage.setItem('dailyTrainingAnalytics', JSON.stringify(analytics));
}

function saveHistory(result) {
  const today = result.date;
  const exists = state.history.some((item) => item.result.date === today && item.result.id === result.id && item.result.condition?.id === result.condition?.id);
  if (!exists) {
    const record = { id: crypto.randomUUID(), result, createdAt: new Date().toISOString() };
    state.history = [record, ...state.history].slice(0, 14);
    localStorage.setItem('dailyTrainingHistory', JSON.stringify(state.history));
  }
}

function setStep(step) {
  state.step = step;
  render();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function render() {
  if (state.step === 'landing') renderLanding();
  if (state.step === 'loading') renderLoading();
  if (state.step === 'result') renderResult();
  if (state.step === 'practice') renderPractice();
  if (state.step === 'survey') renderSurvey();
  bindCommonActions();
}

function renderLanding() {
  track('daily_training_start_view');
  app.innerHTML = `
    <section class="hero card startup-hero">
      <div class="eyebrow">daily actor training</div>
      <h1>오늘 뭘 연습할지<br />고민하지 마세요.</h1>
      <p class="lead">어려운 배우훈련을 오늘 바로 따라 할 수 있는 10분 루틴으로 바꿔드립니다.</p>
      <div class="promise-list">
        <span>배우훈련만</span>
        <span>10분 실행 가이드</span>
        <span>끝나고 30초 기록</span>
      </div>
      <button class="primary hero-button top-cta" data-action="start">오늘 훈련 바로 받기</button>
      <section class="condition-panel" aria-label="오늘 상태 선택">
        <div>
          <h2>오늘 상태를 하나만 골라주세요</h2>
          <p>선택하지 않아도 괜찮아요. 매일 하나의 훈련을 바로 받을 수 있습니다.</p>
        </div>
        <div class="condition-grid">
          ${CONDITION_OPTIONS.map((condition) => `
            <button class="condition-chip ${condition.id === state.selectedConditionId ? 'selected' : ''}" data-action="select-condition" data-condition-id="${condition.id}">
              <strong>${escapeHtml(condition.shortLabel)}</strong>
              <span>${escapeHtml(condition.label)}</span>
            </button>
          `).join('')}
        </div>
      </section>
      <button class="primary hero-button" data-action="start">오늘 훈련 받기</button>
      <p class="helper">뷰포인트 영감, 마이즈너 영감, 즉흥/상상, 감각/관찰, 호흡/집중 중 하나를 추천합니다.</p>
    </section>
    <section class="card value-card">
      <h2>이 서비스가 하는 일</h2>
      <div class="value-grid">
        <div><strong>1. 고르기</strong><span>오늘 상태에 맞는 훈련 하나만 제안합니다.</span></div>
        <div><strong>2. 이해하기</strong><span>이 훈련이 무엇인지, 언제 쓰는지 쉽게 설명합니다.</span></div>
        <div><strong>3. 실행하기</strong><span>0~2분, 2~5분, 5~8분, 8~10분으로 바로 따라 하게 합니다.</span></div>
        <div><strong>4. 남기기</strong><span>끝난 뒤 감각 하나를 기록해 다음 연습의 출발점으로 씁니다.</span></div>
      </div>
    </section>
    ${state.history.length ? renderHistoryPreview() : ''}
  `;
}

function renderHistoryPreview() {
  return `
    <section class="card subtle-card">
      <h2>최근 받은 훈련</h2>
      <ul class="history-list">
        ${state.history.slice(0, 5).map((item) => `
          <li>
            <strong>${escapeHtml(item.result.title)}</strong>
            <span>${escapeHtml(item.result.category)} · ${escapeHtml(item.result.condition?.shortLabel || '랜덤')} · ${escapeHtml(item.result.date)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderLoading() {
  app.innerHTML = `
    <section class="card loading-card">
      <div class="loader" aria-label="추천 중"></div>
      <h1>오늘의 10분 배우훈련을 고르는 중이에요.</h1>
      <p class="lead small">추천보다 중요한 건 바로 시작할 수 있는 설명입니다.</p>
    </section>
  `;
}

function renderResult() {
  const r = state.result;
  const validation = validateTrainingResult(r);
  if (!validation.valid) {
    app.innerHTML = `<section class="card"><h1>추천을 다시 확인해야 해요.</h1><p>${escapeHtml([...validation.forbiddenMatches, ...validation.actorTrainingOnlyMatches].join(', '))}</p></section>`;
    return;
  }

  app.innerHTML = `
    <section class="card result-card">
      <button class="ghost back" data-action="landing">← 처음으로</button>
      <div class="eyebrow">${escapeHtml(r.date)} · ${escapeHtml(r.condition.shortLabel)} · ${escapeHtml(r.category)}</div>
      <div class="result-section highlight">
        <h2>오늘의 배우훈련</h2>
        <h1 class="training-title">${escapeHtml(r.title)}</h1>
        <p>${escapeHtml(r.heroLine)}</p>
        <div class="meta-row">
          <span>${escapeHtml(r.minutes)}분</span>
          <span>${escapeHtml(r.level)}</span>
          <span>${escapeHtml(r.space)}</span>
          <span>준비물: ${escapeHtml(r.equipment)}</span>
        </div>
      </div>
      <div class="result-section">
        <h2>이 훈련은 뭐예요?</h2>
        <p>${escapeHtml(r.guide.whatIsIt)}</p>
      </div>
      <div class="result-section">
        <h2>언제 하면 좋아요?</h2>
        <ul>${r.guide.bestFor.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="result-section">
        <h2>오늘 이걸 하는 이유</h2>
        <p>${escapeHtml(r.summary)}</p>
      </div>
      <div class="result-section">
        <h2>10분 진행법</h2>
        <ol class="timeline-list">
          ${r.timeline.map((item) => `<li><strong>${escapeHtml(item.time)}</strong><span>${escapeHtml(item.instruction)}</span></li>`).join('')}
        </ol>
      </div>
      <div class="result-section">
        <h2>잘하려고 하지 말고 볼 것</h2>
        <ul>${r.guide.watchFor.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="question-box">
        <span>오늘 붙잡을 질문</span>
        <strong>${escapeHtml(r.focusQuestion)}</strong>
      </div>
      <div class="result-section">
        <h2>흔히 헷갈리는 점</h2>
        <p>${escapeHtml(r.guide.commonMistake)}</p>
      </div>
      <div class="result-section">
        <h2>할 때 기억할 것</h2>
        <ul>${r.coachingTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
      </div>
      <div class="question-box secondary">
        <span>끝나고 체크</span>
        <strong>${r.closingCheck.map((item) => escapeHtml(item)).join('<br />')}</strong>
      </div>
      <div class="result-section safety-note">
        <h2>안전하게 하기</h2>
        <p>${escapeHtml(r.guide.safetyNote)}</p>
      </div>
      <div class="cta-panel">
        <h2>다음 행동</h2>
        <p>${escapeHtml(r.cta)}</p>
        <button class="primary" data-action="practice-start">10분 시작하기</button>
      </div>
      <div class="button-row sticky-actions">
        <button class="secondary-button" data-action="copy-result">전체 가이드 복사</button>
        <button class="secondary-button" data-action="copy-share">공유 문구 복사</button>
        <button class="secondary-button" data-action="survey">30초 기록</button>
      </div>
    </section>
  `;
}

function renderPractice() {
  const r = state.result;
  const guide = getPracticeStepState(r, state.practiceStepIndex);
  app.innerHTML = `
    <section class="card practice-card">
      <button class="ghost back" data-action="result">← 전체 진행법 보기</button>
      <div class="practice-topline">
        <span>${escapeHtml(r.title)}</span>
        <strong>${escapeHtml(guide.progressLabel)} · ${escapeHtml(guide.step.time)}</strong>
      </div>
      <div class="practice-progress" aria-label="훈련 진행률">
        ${r.timeline.map((_, index) => `<span class="${index <= guide.currentIndex ? 'active' : ''}"></span>`).join('')}
      </div>
      <h1 class="practice-title">${escapeHtml(guide.step.instruction)}</h1>
      <div class="practice-hint">
        <span>지금 볼 것</span>
        <p>${escapeHtml(guide.hint)}</p>
      </div>
      <div class="practice-question">
        <span>오늘 붙잡을 질문</span>
        <strong>${escapeHtml(r.focusQuestion)}</strong>
      </div>
      <div class="button-row practice-actions">
        <button class="secondary-button" data-action="practice-prev" ${guide.isFirst ? 'disabled' : ''}>이전 단계</button>
        <button class="primary" data-action="${guide.isLast ? 'practice-finish' : 'practice-next'}">${escapeHtml(guide.nextActionLabel)}</button>
      </div>
      <p class="helper">타이머를 켜지 않아도 괜찮아요. 각 구간을 대략 따라가고, 마지막에 몸에 남은 것 하나만 기록하세요.</p>
    </section>
  `;
}

function renderSurvey() {
  const r = state.result;
  app.innerHTML = `
    <section class="card">
      <button class="ghost back" data-action="result">← 결과로</button>
      <div class="eyebrow">30초 기록</div>
      <h1>오늘 몸에 남은 걸 하나만 적어주세요.</h1>
      <p class="lead small">길게 쓰지 않아도 됩니다. 다음에 다시 연습할 때 출발점이 됩니다.</p>
      <form id="survey-form" class="training-form">
        ${renderChoice('didPractice', '실제로 10분을 해봤나요?', ['했다', '일부만 했다', '아직 안 했다'])}
        ${renderChoice('bodyChanged', '끝나고 무엇이 가장 남았나요?', ['몸의 변화', '집중의 변화', '감각의 변화', '아직 잘 모르겠음'])}
        ${renderChoice('wantAgain', '내일도 받고 싶나요?', ['예', '아니오', '상황에 따라'])}
        <label class="field-card">
          <span class="field-label">오늘 남은 한 문장</span>
          <textarea name="reflection" rows="3" placeholder="예: 천천히 걷자 시선이 먼저 움직였다."></textarea>
        </label>
        <input type="hidden" name="trainingId" value="${escapeHtml(r.id)}" />
        <button class="primary wide" type="submit">기록 저장하기</button>
      </form>
    </section>
  `;
  document.querySelector('#survey-form').addEventListener('submit', (event) => {
    event.preventDefault();
    state.survey = Object.fromEntries(new FormData(event.target).entries());
    localStorage.setItem('dailyTrainingSurveyLatest', JSON.stringify({ survey: state.survey, training: r, at: new Date().toISOString() }));
    track('daily_training_survey_submit', { trainingId: r.id, conditionId: r.condition.id, didPractice: state.survey.didPractice });
    alert('저장됐어요. 내일은 다른 훈련을 이어갈 수 있어요.');
    setStep('result');
  });
}

function renderChoice(name, label, choices) {
  return `
    <fieldset class="field-card choices">
      <legend>${label}</legend>
      ${choices.map((choice) => `
        <label><input type="radio" name="${name}" value="${escapeHtml(choice)}" required /> ${escapeHtml(choice)}</label>
      `).join('')}
    </fieldset>
  `;
}

function resultAsText() {
  const r = state.result;
  return `오늘의 배우훈련\n${r.title}\n\n${r.heroLine}\n\n이 훈련은 뭐예요?\n${r.guide.whatIsIt}\n\n언제 하면 좋아요?\n${r.guide.bestFor.map((item) => `- ${item}`).join('\n')}\n\n10분 진행법\n${r.timeline.map((item) => `${item.time}: ${item.instruction}`).join('\n')}\n\n잘하려고 하지 말고 볼 것\n${r.guide.watchFor.map((item) => `- ${item}`).join('\n')}\n\n오늘 붙잡을 질문\n${r.focusQuestion}\n\n끝나고 체크\n${r.closingCheck.map((item) => `- ${item}`).join('\n')}`;
}

async function copy(text) {
  await navigator.clipboard.writeText(text);
  alert('복사됐어요.');
}

function bindCommonActions() {
  document.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', async () => {
      const action = element.dataset.action;
      if (action === 'select-condition') {
        state.selectedConditionId = element.dataset.conditionId;
        localStorage.setItem('dailyTrainingCondition', state.selectedConditionId);
        track('daily_training_condition_select', { conditionId: state.selectedConditionId });
        render();
      }
      if (action === 'start') {
        track('daily_training_start_click', { conditionId: state.selectedConditionId });
        setStep('loading');
        window.setTimeout(() => {
          state.result = generateTraining({ conditionId: state.selectedConditionId });
          state.practiceStepIndex = 0;
          saveHistory(state.result);
          track('daily_training_result_success', { trainingId: state.result.id, category: state.result.category, conditionId: state.result.condition.id });
          setStep('result');
        }, 400);
      }
      if (action === 'landing') setStep('landing');
      if (action === 'result') setStep('result');
      if (action === 'survey') setStep('survey');
      if (action === 'copy-result') {
        await copy(resultAsText());
        track('daily_training_copy', { copyType: 'full_result', trainingId: state.result.id });
      }
      if (action === 'copy-share') {
        await copy(copyForShare(state.result));
        track('daily_training_share', { shareType: 'daily_training', trainingId: state.result.id });
      }
      if (action === 'practice-start') {
        state.practiceStepIndex = 0;
        track('daily_training_practice_start', { trainingId: state.result.id });
        setStep('practice');
      }
      if (action === 'practice-next') {
        state.practiceStepIndex += 1;
        track('daily_training_practice_step', { trainingId: state.result.id, stepIndex: state.practiceStepIndex });
        setStep('practice');
      }
      if (action === 'practice-prev') {
        state.practiceStepIndex -= 1;
        setStep('practice');
      }
      if (action === 'practice-finish') {
        track('daily_training_practice_finish', { trainingId: state.result.id });
        setStep('survey');
      }
      if (action === 'done-practice') {
        track('daily_training_done_click', { trainingId: state.result.id });
        setStep('survey');
      }
    });
  });
}

render();
