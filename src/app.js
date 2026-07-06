import { copyForShare, generateTraining, validateTrainingResult } from './trainingGenerator.js';

const app = document.querySelector('#app');
const state = {
  step: 'landing',
  result: generateTraining(),
  history: loadHistory(),
  survey: {}
};

const analytics = loadAnalytics();

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
  const exists = state.history.some((item) => item.result.date === today && item.result.id === result.id);
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
  if (state.step === 'survey') renderSurvey();
  bindCommonActions();
}

function renderLanding() {
  track('daily_training_start_view');
  app.innerHTML = `
    <section class="hero card">
      <div class="eyebrow">acttub daily practice</div>
      <h1>오늘의 연기 훈련!</h1>
      <p class="lead">오늘 10분 동안 뭐 할지 모르겠다면, 대본이 있어도 없어도 바로 해볼 수 있는 훈련 하나를 추천해드릴게요.</p>
      <div class="promise-list">
        <span>매일 랜덤</span>
        <span>10분 진행법</span>
        <span>오늘 하나만</span>
      </div>
      <button class="primary" data-action="start">오늘 훈련 받기</button>
      <p class="helper">뷰포인트 영감, 마이즈너 영감, 장면, 감각/관찰, 호흡/집중 훈련 중 하나가 매일 달라져요.</p>
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
            <span>${escapeHtml(item.result.category)} · ${escapeHtml(item.result.date)}</span>
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
      <h1>오늘의 10분 훈련을 뽑는 중이에요.</h1>
      <p class="lead small">오늘은 하나만. 설명을 읽고 바로 시작할 수 있게 자세히 안내할게요.</p>
    </section>
  `;
}

function renderResult() {
  const r = state.result;
  const validation = validateTrainingResult(r);
  if (!validation.valid) {
    app.innerHTML = `<section class="card"><h1>추천을 다시 확인해야 해요.</h1><p>${escapeHtml(validation.forbiddenMatches.join(', '))}</p></section>`;
    return;
  }

  app.innerHTML = `
    <section class="card result-card">
      <button class="ghost back" data-action="landing">← 처음으로</button>
      <div class="eyebrow">${escapeHtml(r.date)} · ${escapeHtml(r.category)}</div>
      <div class="result-section highlight">
        <h2>오늘의 연기 훈련</h2>
        <h1 class="training-title">${escapeHtml(r.title)}</h1>
        <p>${escapeHtml(r.heroLine)}</p>
      </div>
      <div class="result-section">
        <h2>오늘 이걸 해보는 이유</h2>
        <p>${escapeHtml(r.summary)}</p>
      </div>
      <div class="result-section">
        <h2>10분 진행법</h2>
        <ol class="timeline-list">
          ${r.timeline.map((item) => `<li><strong>${escapeHtml(item.time)}</strong><span>${escapeHtml(item.instruction)}</span></li>`).join('')}
        </ol>
      </div>
      <div class="question-box">
        <span>오늘 붙잡을 질문</span>
        <strong>${escapeHtml(r.focusQuestion)}</strong>
      </div>
      <div class="result-section">
        <h2>할 때 기억할 것</h2>
        <ul>${r.coachingTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
      </div>
      <div class="question-box secondary">
        <span>끝나고 체크</span>
        <strong>${r.closingCheck.map((item) => escapeHtml(item)).join('<br />')}</strong>
      </div>
      <div class="cta-panel">
        <h2>다음 행동</h2>
        <p>${escapeHtml(r.cta)}</p>
        <button class="primary" data-action="done-practice">훈련 해봤다</button>
      </div>
      <div class="button-row">
        <button class="secondary-button" data-action="copy-result">결과 복사하기</button>
        <button class="secondary-button" data-action="copy-share">공유 문구 복사</button>
        <button class="secondary-button" data-action="survey">1분 기록</button>
      </div>
    </section>
  `;
}

function renderSurvey() {
  const r = state.result;
  app.innerHTML = `
    <section class="card">
      <button class="ghost back" data-action="result">← 결과로</button>
      <div class="eyebrow">1분 기록</div>
      <h1>오늘 훈련을 해봤나요?</h1>
      <p class="lead small">이 기록은 내일 어떤 훈련을 이어갈지 판단하는 재료가 됩니다.</p>
      <form id="survey-form" class="training-form">
        ${renderChoice('didPractice', '실제로 10분을 해봤나요?', ['했다', '일부만 했다', '아직 안 했다'])}
        ${renderChoice('bodyChanged', '끝나고 달라진 게 있었나요?', ['몸이 달라졌다', '집중이 달라졌다', '장면이 달라졌다', '잘 모르겠다'])}
        ${renderChoice('wantAgain', '내일도 랜덤 훈련을 받고 싶나요?', ['예', '아니오', '상황에 따라'])}
        <label class="field-card">
          <span class="field-label">오늘 남은 한 문장</span>
          <textarea name="reflection" rows="3" placeholder="예: 빠르게 걷다가 멈출 때 몸이 제일 깨어났다."></textarea>
        </label>
        <input type="hidden" name="trainingId" value="${escapeHtml(r.id)}" />
        <button class="primary wide" type="submit">기록 저장하기</button>
      </form>
    </section>
  `;
  document.querySelector('#survey-form').addEventListener('submit', (event) => {
    event.preventDefault();
    state.survey = Object.fromEntries(new FormData(event.target).entries());
    localStorage.setItem('dailyTrainingSurveyLatest', JSON.stringify({ survey: state.survey, at: new Date().toISOString() }));
    track('daily_training_survey_submit', { trainingId: r.id, didPractice: state.survey.didPractice });
    alert('저장됐어요. 내일은 또 다른 훈련을 뽑아볼 수 있어요.');
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
  return `오늘의 연기 훈련\n${r.title}\n\n${r.heroLine}\n\n오늘 이걸 해보는 이유\n${r.summary}\n\n10분 진행법\n${r.timeline.map((item) => `${item.time}: ${item.instruction}`).join('\n')}\n\n오늘 붙잡을 질문\n${r.focusQuestion}\n\n할 때 기억할 것\n${r.coachingTips.map((tip) => `- ${tip}`).join('\n')}\n\n끝나고 체크\n${r.closingCheck.map((item) => `- ${item}`).join('\n')}`;
}

async function copy(text) {
  await navigator.clipboard.writeText(text);
  alert('복사됐어요.');
}

function bindCommonActions() {
  document.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', async () => {
      const action = element.dataset.action;
      if (action === 'start') {
        track('daily_training_random_start', { date: state.result.date });
        setStep('loading');
        window.setTimeout(() => {
          state.result = generateTraining();
          saveHistory(state.result);
          track('daily_training_result_success', { trainingId: state.result.id, category: state.result.category });
          setStep('result');
        }, 500);
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
      if (action === 'done-practice') {
        track('daily_training_done_click', { trainingId: state.result.id });
        setStep('survey');
      }
    });
  });
}

render();
