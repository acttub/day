import { fieldDefinitions, generateTraining, validateTrainingResult, copyForShare } from './trainingGenerator.js';

const app = document.querySelector('#app');
const state = {
  step: 'landing',
  input: loadDraft(),
  result: null,
  history: loadHistory(),
  survey: {}
};

const analytics = [];

function track(event, properties = {}) {
  analytics.push({ event, properties, at: new Date().toISOString() });
  localStorage.setItem('dailyTrainingAnalytics', JSON.stringify(analytics));
}

function loadDraft() {
  try {
    return JSON.parse(localStorage.getItem('dailyTrainingDraft') || '{}');
  } catch {
    return {};
  }
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem('dailyTrainingHistory') || '[]');
  } catch {
    return [];
  }
}

function saveDraft() {
  localStorage.setItem('dailyTrainingDraft', JSON.stringify(state.input));
}

function saveHistory(result) {
  const record = { id: crypto.randomUUID(), input: state.input, result, createdAt: new Date().toISOString() };
  state.history = [record, ...state.history].slice(0, 10);
  localStorage.setItem('dailyTrainingHistory', JSON.stringify(state.history));
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
  if (state.step === 'form') renderForm();
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
      <h1>오늘 연습할 장면,<br />무엇부터 봐야 할지 모르겠다면</h1>
      <p class="lead">장면 상황을 짧게 적으면, 오늘 가장 먼저 채워볼 생각 하나와 10분 연기훈련을 추천해드려요.</p>
      <div class="promise-list">
        <span>점수 없음</span>
        <span>평가 없음</span>
        <span>오늘 하나만</span>
      </div>
      <button class="primary" data-action="start">오늘 훈련 받기</button>
      <p class="helper">내 장면을 다시 보게 만드는 질문으로 시작합니다.</p>
    </section>
    ${state.history.length ? renderHistoryPreview() : ''}
  `;
}

function renderHistoryPreview() {
  return `
    <section class="card subtle-card">
      <h2>최근 받은 훈련</h2>
      <ul class="history-list">
        ${state.history.slice(0, 3).map((item) => `
          <li>
            <strong>${escapeHtml(item.result.trainingTitle)}</strong>
            <span>${escapeHtml(item.result.thoughtToFill)}</span>
          </li>
        `).join('')}
      </ul>
    </section>
  `;
}

function renderForm() {
  app.innerHTML = `
    <section class="card">
      <button class="ghost back" data-action="landing">← 처음으로</button>
      <div class="eyebrow">3분 입력</div>
      <h1>정답처럼 쓰지 않아도 괜찮아요.</h1>
      <p class="lead small">지금 떠오르는 만큼만 적어주세요. 모르는 부분은 “잘 모르겠다”라고 써도 됩니다.</p>
      <form id="training-form" class="training-form">
        ${fieldDefinitions.map((field, index) => `
          <label class="field-card">
            <span class="field-index">${index + 1}</span>
            <span class="field-label">${escapeHtml(field.question)}</span>
            <textarea name="${field.name}" rows="3" placeholder="${escapeHtml(field.placeholder)}" required>${escapeHtml(state.input[field.name] || '')}</textarea>
          </label>
        `).join('')}
        <label class="field-card optional">
          <span class="field-index">+</span>
          <span class="field-label">지금 어느 단계에 가까운가요? <em>선택</em></span>
          <select name="actorLevel">
            ${['', '입시 준비', '전공/학생', '초보 취미', '오디션/프로 준비', '기타'].map((value) => `
              <option value="${escapeHtml(value)}" ${state.input.actorLevel === value ? 'selected' : ''}>${value || '선택하지 않음'}</option>
            `).join('')}
          </select>
        </label>
        <label class="field-card optional">
          <span class="field-index">+</span>
          <span class="field-label">지금 몇 분 정도 연습할 수 있나요? <em>선택</em></span>
          <select name="practiceTime">
            ${['10분', '5분', '15분', '20분'].map((value) => `
              <option value="${value}" ${state.input.practiceTime === value ? 'selected' : ''}>${value}</option>
            `).join('')}
          </select>
        </label>
        <button class="primary wide" type="submit">오늘 채울 생각 찾기</button>
      </form>
    </section>
  `;

  const form = document.querySelector('#training-form');
  form.addEventListener('input', (event) => {
    const { name, value } = event.target;
    state.input[name] = value;
    saveDraft();
    track('daily_training_input_start', { fieldName: name });
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    state.input = Object.fromEntries(formData.entries());
    saveDraft();
    track('daily_training_submit', { actorLevel: state.input.actorLevel || 'none' });
    setStep('loading');
    window.setTimeout(() => {
      state.result = generateTraining(state.input);
      const validation = validateTrainingResult(state.result);
      if (!validation.valid) {
        track('daily_training_result_fail', { forbiddenMatches: validation.forbiddenMatches });
        alert('결과 문장에 안전하지 않은 표현이 있어 다시 생성해주세요.');
        setStep('form');
        return;
      }
      saveHistory(state.result);
      track('daily_training_result_success', { pattern: state.result.pattern });
      setStep('result');
    }, 650);
  });
}

function renderLoading() {
  app.innerHTML = `
    <section class="card loading-card">
      <div class="loader" aria-label="생성 중"></div>
      <h1>오늘 채울 생각을 고르는 중이에요.</h1>
      <p class="lead small">좋은 훈련은 많이 하는 게 아니라, 지금 필요한 하나를 정확히 붙잡는 것에서 시작해요.</p>
    </section>
  `;
}

function renderResult() {
  const r = state.result;
  app.innerHTML = `
    <section class="card result-card">
      <button class="ghost back" data-action="form">← 입력 수정</button>
      <div class="eyebrow">오늘의 연기훈련</div>
      <div class="result-section highlight">
        <h2>오늘 채울 생각</h2>
        <p>${escapeHtml(r.thoughtToFill)}</p>
      </div>
      <div class="result-section">
        <h2>왜 이 훈련인가</h2>
        <p>${escapeHtml(r.reason)}</p>
      </div>
      <div class="result-section">
        <h2>오늘의 ${escapeHtml(state.input.practiceTime || '10분')} 훈련 — ${escapeHtml(r.trainingTitle)}</h2>
        <ol>${r.trainingSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      </div>
      <div class="question-box">
        <span>시작 질문</span>
        <strong>${escapeHtml(r.startingQuestion)}</strong>
      </div>
      <div class="question-box secondary">
        <span>마무리 질문</span>
        <strong>${escapeHtml(r.closingQuestion)}</strong>
      </div>
      <div class="cta-panel">
        <h2>다음 행동</h2>
        <p>${escapeHtml(r.cta)}</p>
        <button class="primary" data-action="video-cta">이 훈련을 영상으로 해보고 질문 대화로 이어가기</button>
      </div>
      <div class="button-row">
        <button class="secondary-button" data-action="copy-result">결과 복사하기</button>
        <button class="secondary-button" data-action="copy-share">질문 카드 복사</button>
        <button class="secondary-button" data-action="survey">1분 설문</button>
      </div>
    </section>
  `;
}

function renderSurvey() {
  app.innerHTML = `
    <section class="card">
      <button class="ghost back" data-action="result">← 결과로</button>
      <div class="eyebrow">1분 설문</div>
      <h1>방금 받은 훈련이 실제 연습에 도움이 됐나요?</h1>
      <p class="lead small">좋았다는 말보다, 어디가 안 맞았는지가 더 중요해요.</p>
      <form id="survey-form" class="training-form">
        ${renderScale('understood', '왜 이 훈련인지 이해됐나요?')}
        ${renderScale('relevant', '내 장면과 관련 있다고 느꼈나요?')}
        ${renderChoice('judged', '평가받는 느낌이었나요?', ['전혀 아니었다', '조금 있었다', '꽤 있었다', '많이 있었다'])}
        ${renderChoice('didPractice', '10분 훈련을 실제로 해볼 수 있었나요?', ['했다', '일부만 했다', '못 했다'])}
        ${renderChoice('reuse', '내일도 다른 장면으로 받아보고 싶나요?', ['예', '아니오', '상황에 따라'])}
        <label class="field-card">
          <span class="field-label">오늘 채운 생각을 한 문장으로 말하면?</span>
          <textarea name="reflection" rows="3" placeholder="예: 상대를 설득하기보다 붙잡힐까 봐 방어하고 있었다."></textarea>
        </label>
        <button class="primary wide" type="submit">설문 저장하기</button>
      </form>
    </section>
  `;
  document.querySelector('#survey-form').addEventListener('submit', (event) => {
    event.preventDefault();
    state.survey = Object.fromEntries(new FormData(event.target).entries());
    localStorage.setItem('dailyTrainingSurveyLatest', JSON.stringify({ survey: state.survey, at: new Date().toISOString() }));
    track('daily_training_survey_submit', { understood: state.survey.understood, reuse: state.survey.reuse });
    alert('저장됐어요. 솔직한 응답이 다음 버전을 만드는 데 제일 중요해요.');
    setStep('result');
  });
}

function renderScale(name, label) {
  return `
    <fieldset class="field-card scale">
      <legend>${label}</legend>
      <div class="scale-row">
        ${[1, 2, 3, 4, 5].map((value) => `
          <label><input type="radio" name="${name}" value="${value}" required /><span>${value}</span></label>
        `).join('')}
      </div>
    </fieldset>
  `;
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
  return `오늘 채울 생각\n${r.thoughtToFill}\n\n왜 이 훈련인가\n${r.reason}\n\n오늘의 10분 훈련 — ${r.trainingTitle}\n1. ${r.trainingSteps[0]}\n2. ${r.trainingSteps[1]}\n3. ${r.trainingSteps[2]}\n\n시작 질문\n${r.startingQuestion}\n\n마무리 질문\n${r.closingQuestion}\n\n다음 행동\n${r.cta}`;
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
        track('daily_training_input_start', { source: 'landing' });
        setStep('form');
      }
      if (action === 'landing') setStep('landing');
      if (action === 'form') setStep('form');
      if (action === 'result') setStep('result');
      if (action === 'survey') setStep('survey');
      if (action === 'copy-result') {
        await copy(resultAsText());
        track('daily_training_copy', { copyType: 'full_result' });
      }
      if (action === 'copy-share') {
        await copy(copyForShare(state.result));
        track('daily_training_share', { shareType: 'question_card' });
      }
      if (action === 'video-cta') {
        track('daily_training_cta_click', { destination: 'acttub_video_session' });
        alert('MVP에서는 CTA 클릭을 기록합니다. 실제 서비스에서는 영상 업로드/질문 대화 화면으로 연결하세요.');
      }
    });
  });
}

render();
