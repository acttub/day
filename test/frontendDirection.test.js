import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const cssSource = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('landing copy explains the fortune-like daily activity in the first screen', () => {
  assert.match(appSource, /오늘의 배우운세/);
  assert.match(appSource, /오늘 할 연습 활동 하나/);
  assert.match(appSource, /운세처럼/);
  assert.doesNotMatch(appSource, /오늘 상태를 하나만 골라주세요/);
  assert.doesNotMatch(appSource, /어려운 배우훈련/);
});

test('front-end keeps one clear primary action before any optional details', () => {
  const heroIndex = appSource.indexOf('오늘의 배우운세');
  const ctaIndex = appSource.indexOf('오늘 활동 뽑기');
  const detailIndex = appSource.indexOf('최근 받은 활동');

  assert.ok(heroIndex >= 0);
  assert.ok(ctaIndex > heroIndex);
  assert.ok(detailIndex === -1 || ctaIndex < detailIndex);
});

test('layout css uses a simple mobile-first shell without glassmorphism overflow risk', () => {
  assert.match(cssSource, /\.fortune-card/);
  assert.match(cssSource, /max-width:\s*480px/);
  assert.doesNotMatch(cssSource, /backdrop-filter/);
  assert.doesNotMatch(cssSource, /min-height:\s*86vh/);
});
