import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { root, read, hash, sourceModel, sourceKey, makeCases } from './model.mjs';

const { html, records } = sourceModel();
const manifest = JSON.parse(read('data/manifest.json'));
const registry = JSON.parse(read('data/ids.json'));
const { cases } = JSON.parse(read('data/cases.json'));
const index = JSON.parse(read('data/index.json'));
assert.equal(records.length, 278);
assert.equal(cases.length, 278);
assert.equal(index.count, 278);
assert.deepEqual(cases, makeCases(records, registry), '사례 명세가 원본과 다릅니다. npm run build를 실행하세요.');
assert.equal(manifest.sourceSha256, hash(html));
assert.equal(manifest.casesSha256, hash(JSON.stringify(records.map(x => x.original))));
assert.equal(new Set(cases.map(x => x.id)).size, 278);
for (const item of cases) {
  assert.deepEqual(item.original, records.find(x => sourceKey(x.original) === sourceKey(item.original)).original);
  assert.ok(item.motion.instruction, item.id + ' 모션 누락');
  assert.ok(item.original.demo, item.id + ' UI 누락');
  assert.ok(read(item.paths.specification).includes(item.motion.instruction), item.id + ' 명세 모션 누락');
  assert.ok(read(item.paths.specification).includes('[UI 참조: ' + item.id + ']'), item.id + ' 지시문 ID 누락');
  assert.equal(index.cases.find(x => x.id === item.id).paths.preview, item.paths.preview);
}
const site = read('site/index.html');
const scripts = [...site.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length, 1);
new vm.Script(scripts[0][1]);
assert.ok(site.includes('referencePromptHeader(item)+item.copyPrompt'));
assert.ok(site.includes('selected.map((item,i)=>referencePromptHeader(item)+'));
assert.ok(site.includes('${referenceIdFor(x)} ${motionTypesFor(x)'));
assert.ok(site.includes("get('case')"));
// Restore the data part of the generated site and compare ALL fields, not just case counts.
const dataScript = scripts[0][1].slice(0, scripts[0][1].indexOf("let filter='전체'"));
const actual = JSON.parse(vm.runInNewContext(dataScript + ';JSON.stringify(items)', {}, { timeout: 5000 }));
assert.deepEqual(actual, records.map(x => x.original), '생성된 화면의 UI/모션 데이터가 바뀌었습니다.');
for (const name of fs.readdirSync(path.join(root, 'src/support'))) {
  if (name === 'index.html' || name === '컴포넌트-라이브러리.html') continue;
  assert.ok(fs.readFileSync(path.join(root, 'site', name)).equals(fs.readFileSync(path.join(root, 'src/support', name))), '참조 자료 불일치: ' + name);
}
console.log('PASS: 278개 모든 원본 필드 보존, ID/명세/검색 경로 연결, 생성 화면 구문, 참조 자료 일치');
console.log('실제 브라우저 조작과 사용자 프로젝트 검증은 이 검사에 포함되지 않습니다.');
