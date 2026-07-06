# 오늘의 연기훈련 MVP — 구현본

acttub의 질문형 자기진단 방향을 가볍게 매일 쓰게 만드는 독립 실행형 웹 MVP입니다.

## 기능

- 랜딩 화면
- 5개 장면 맥락 입력
- 오늘 채울 생각 생성
- 오늘의 10분 훈련 생성
- 시작 질문 / 마무리 질문 생성
- 결과 복사
- 질문 카드 복사
- 1분 설문 저장
- 최근 생성 결과 로컬 저장
- 기본 이벤트 로컬 기록

## 실행

```bash
cd /home/insung/daily-acting-training-mvp
npm test
npm start
```

브라우저에서 열기:

```txt
http://localhost:4173
```

## 테스트

```bash
npm test
```

테스트 범위:

- 필수 출력 계약
- 사용자 입력 기반 근거 연결
- 영상을 본 것처럼 말하지 않기
- 평가/점수/강점/약점 표현 금지
- `잘 모르겠다` 입력 fallback
- 공유 카드 개인정보 최소화

## 파일 구조

```txt
index.html
package.json
src/
  app.js
  styles.css
  trainingGenerator.js
test/
  trainingGenerator.test.js
```

## 현재 구현 방식

첫 MVP 검증을 위해 외부 AI API 없이 로컬 규칙 기반 생성기로 구현했습니다. 그래서 바로 실행 가능하고, 테스트 참여자에게 링크를 열어 반자동/현장 테스트를 진행할 수 있습니다.

나중에 실제 LLM API를 붙일 때는 `src/trainingGenerator.js`의 `generateTraining()`만 API 호출로 교체하면 됩니다. UI와 테스트 구조는 그대로 재사용할 수 있습니다.
