import { copyForShare, generateTraining, getPracticeStepState, validateTrainingResult } from './trainingGenerator.js';

const app = document.querySelector('#app');
const state = {
  step: 'landing',
  result: generateTraining({ conditionId: 'just-random' }),
  practiceStepIndex: 0,
  history: loadHistory(),
  toast: ''
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
  localStorage.setItem('dailyTrainingAnalytics', JSON.stringify(analytics.slice(-100)));
}

function saveHistory(result) {
  const exists = state.history.some((item) => item.result.date === result.date && item.result.id === result.id);
  if (!exists) {
    const record = { id: crypto.randomUUID(), result, createdAt: new Date().toISOString() };
    state.history = [record, ...state.history].slice(0, 7);
    localStorage.setItem('dailyTrainingHistory', JSON.stringify(state.history));
  }
}

function setStep(step) {
  state.step = step;
  render();
}

function showToast(message) {
  state.toast = message;
  render();
  window.setTimeout(() => {
    state.toast = '';
    render();
  }, 1800);
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
  if (state.step === 'done') renderDone();
  renderToast();
  bindActions();
}

function renderToast() {
  if (!state.toast) return;
  app.insertAdjacentHTML('beforeend', `<div class="toast" role="status">${escapeHtml(state.toast)}</div>`);
}

function renderLanding() {
  track('daily_activity_landing_view');
  app.innerHTML = `
    <section class="fortune-card home-card">
      <div class="app-label">오늘의 배우운세</div>
      <div class="fortune-orb" aria-hidden="true">✦</div>
      <h1>오늘 할 연습 활동 하나만 뽑아드릴게요.</h1>
      <p class="lead">운세처럼 가볍게 열어보고, 마음에 들면 10분만 따라 해보세요. 대본도 선택도 필요 없어요.</p>
      <button class="primary big" data-action="draw">오늘 활동 뽑기</button>
      <p class="caption">매일 하나 · 배우훈련 활동 추천 · 혼자 해도 됨</p>
    </section>
    ${state.history.length ? renderHistoryPreview() : ''}
  `;
}

function renderHistoryPreview() {
  return `
    <section class="simple-section">
      <h2>최근 받은 활동</h2>
      <ul class="history-list">
        ${state.history.slice(0, 3).map((item) => `
          <li>
            <strong>${escapeHtml(item.result.title)}</strong>
            <span>${escapeHtml(item.result.date)} · ${escapeHtml(item.result.category)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderLoading() {
  app.innerHTML = `
    <section class="fortune-card loading-card">
      <div class="loader" aria-label="활동 뽑는 중"></div>
      <h1>오늘의 활동을 뽑는 중</h1>
      <p class="lead small">오늘은 어떤 감각을 열어볼까요?</p>
    </section>
  `;
}

function renderResult() {
  const r = state.result;
  const validation = validateTrainingResult(r);
  if (!validation.valid) {
    app.innerHTML = `<section class="fortune-card"><h1>오늘 활동을 다시 뽑아야 해요.</h1><p>${escapeHtml([...validation.forbiddenMatches, ...validation.actorTrainingOnlyMatches].join(', '))}</p></section>`;
    return;
  }

  app.innerHTML = `
    <section class="fortune-card result-card">
      <button class="text-button" data-action="landing">← 다시 뽑기</button>
      <div class="result-top">
        <div>
          <span class="date-chip">${escapeHtml(r.date)}</span>
          <p class="kicker">오늘의 연습 활동</p>
          <h1>${escapeHtml(r.title)}</h1>
        </div>
        <div class="mini-orb" aria-hidden="true">✦</div>
      </div>
      <p class="fortune-line">${escapeHtml(r.heroLine)}</p>
      <button class="primary big" data-action="practice-start">10분 시작하기</button>
      <div class="info-strip">
        <span>${escapeHtml(r.category)}</span>
        <span>${escapeHtml(r.minutes)}분</span>
        <span>${escapeHtml(r.space)}</span>
      </div>
      <section class="activity-panel">
        <h2>오늘 할 일</h2>
        <ol class="timeline-list">
          ${r.timeline.map((item) => `<li><strong>${escapeHtml(item.time)}</strong><span>${escapeHtml(item.instruction)}</span></li>`).join('')}
        </ol>
      </section>
      <section class="activity-panel soft">
        <h2>운세 한 줄</h2>
        <p>${escapeHtml(r.focusQuestion)}</p>
      </section>
      <div class="button-row">
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
    <section class="fortune-card practice-card">
      <button class="text-button" data-action="result">← 활동 카드로</button>
      <div class="practice-topline">
        <span>${escapeHtml(r.title)}</span>
        <strong>${escapeHtml(guide.progressLabel)} · ${escapeHtml(guide.step.time)}</strong>
      </div>
      <div class="practice-progress" aria-label="훈련 진행률">
        ${r.timeline.map((_, index) => `<span class="${index <= guide.currentIndex ? 'active' : ''}"></span>`).join('')}
      </div>
      <h1>${escapeHtml(guide.step.instruction)}</h1>
      <div class="hint-card">
        <span>지금 볼 것</span>
        <p>${escapeHtml(guide.hint)}</p>
      </div>
      <div class="button-row practice-actions">
        <button class="secondary-button" data-action="practice-prev" ${guide.isFirst ? 'disabled' : ''}>이전</button>
        <button class="primary" data-action="${guide.isLast ? 'practice-finish' : 'practice-next'}">${escapeHtml(guide.nextActionLabel)}</button>
      </div>
    </section>
  `;
}

function renderSurvey() {
  const r = state.result;
  app.innerHTML = `
    <section class="fortune-card">
      <button class="text-button" data-action="result">← 활동 카드로</button>
      <p class="kicker">30초 기록</p>
      <h1>오늘 남은 감각 하나만 적어주세요.</h1>
      <form id="survey-form" class="training-form">
        ${renderChoice('didPractice', '해봤나요?', ['했다', '조금 했다', '아직'])}
        ${renderChoice('wantAgain', '내일도 뽑을까요?', ['예', '상황에 따라', '아니오'])}
        <label class="field-card">
          <span>오늘 남은 한 문장</span>
          <textarea name="reflection" rows="3" placeholder="예: 멈췄다가 시작하니 덜 급했다."></textarea>
        </label>
        <input type="hidden" name="trainingId" value="${escapeHtml(r.id)}" />
        <button class="primary big" type="submit">기록 저장하기</button>
      </form>
    </section>
  `;
  document.querySelector('#survey-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const survey = Object.fromEntries(new FormData(event.target).entries());
    localStorage.setItem('dailyTrainingSurveyLatest', JSON.stringify({ survey, training: r, at: new Date().toISOString() }));
    track('daily_activity_record_submit', { trainingId: r.id, didPractice: survey.didPractice });
    setStep('done');
  });
}

function renderChoice(name, label, choices) {
  return `
    <fieldset class="field-card choices">
      <legend>${escapeHtml(label)}</legend>
      ${choices.map((choice) => `<label><input type="radio" name="${name}" value="${escapeHtml(choice)}" required /> ${escapeHtml(choice)}</label>`).join('')}
    </fieldset>
  `;
}

function renderDone() {
  const latest = JSON.parse(localStorage.getItem('dailyTrainingSurveyLatest') || '{}');
  const reflection = latest.survey?.reflection;
  app.innerHTML = `
    <section class="fortune-card done-card">
      <div class="fortune-orb small" aria-hidden="true">✓</div>
      <p class="kicker">기록 완료</p>
      <h1>오늘 활동은 여기까지.</h1>
      ${reflection ? `<blockquote>${escapeHtml(reflection)}</blockquote>` : ''}
      <p class="lead small">내일 다시 열면 다른 활동을 하나 뽑아드릴게요.</p>
      <button class="primary big" data-action="landing">처음으로</button>
      <button class="secondary-button" data-action="copy-share">친구에게 보내기</button>
    </section>
  `;
}

async function copy(text) {
  await navigator.clipboard.writeText(text);
  showToast('복사됐어요. 배우 친구에게 보내보세요.');
}

function bindActions() {
  document.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', async () => {
      const action = element.dataset.action;
      if (action === 'draw') {
        track('daily_activity_draw_click');
        setStep('loading');
        window.setTimeout(() => {
          state.result = generateTraining({ conditionId: 'just-random' });
          state.practiceStepIndex = 0;
          saveHistory(state.result);
          track('daily_activity_result_success', { trainingId: state.result.id, category: state.result.category });
          setStep('result');
        }, 500);
      }
      if (action === 'landing') setStep('landing');
      if (action === 'result') setStep('result');
      if (action === 'survey') setStep('survey');
      if (action === 'copy-share') {
        await copy(copyForShare(state.result));
        track('daily_activity_share_copy', { trainingId: state.result.id });
      }
      if (action === 'practice-start') {
        state.practiceStepIndex = 0;
        track('daily_activity_practice_start', { trainingId: state.result.id });
        setStep('practice');
      }
      if (action === 'practice-next') {
        state.practiceStepIndex += 1;
        setStep('practice');
      }
      if (action === 'practice-prev') {
        state.practiceStepIndex -= 1;
        setStep('practice');
      }
      if (action === 'practice-finish') {
        setStep('survey');
      }
    });
  });
}

render();
