import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { root, read, registryFor, sourceKey, promptFor, searchCases } from './model.mjs';

const { cases } = JSON.parse(read('data/cases.json'));
const registry = JSON.parse(read('data/ids.json'));
test('278개 사례가 고유 ID로 검색되며 UI와 모션을 함께 전달한다', () => {
  for (const item of cases) {
    assert.equal(searchCases(cases, item.id)[0]?.id, item.id);
    const prompt = promptFor(item);
    assert.ok(prompt.includes('references/' + item.id + '.md'));
    assert.ok(prompt.includes(item.motion.instruction));
    assert.ok(item.original.demo);
    assert.ok(prompt.includes('AGENTS.md'));
  }
});
test('순서가 바뀌어도 기존 ID를 유지하고 새 ID는 재사용하지 않는다', () => {
  const reversed = [...cases].reverse().map(x => ({ original: x.original }));
  const result = registryFor(reversed, registry);
  assert.deepEqual(result.entries, registry.entries);
  const withNew = registryFor([...reversed, { original: { title: '등록부 시험용 사례', source: 'https://example.invalid/test' } }], registry);
  assert.equal(withNew.entries.at(-1).id, 'ui-0279');
  assert.equal(withNew.entries.find(x => x.key === sourceKey(cases[0].original)).id, cases[0].id);
  assert.throws(() => registryFor([], { entries: [registry.entries[0], registry.entries[0]] }), /중복/);
});
test('검색어와 분류를 함께 적용하며 모르는 항목을 만들어내지 않는다', () => {
  const found = searchCases(cases, '달력', { category: '날짜', limit: 3 });
  assert.ok(found.length > 0 && found.length <= 3);
  assert.ok(found.every(x => [x.category, ...x.relatedCategories].some(x => x.includes('날짜'))));
  assert.deepEqual(searchCases(cases, 'unregistered-reference-99999'), []);
  assert.deepEqual(searchCases(cases, '달력', { category: '존재하지 않는 분류' }), []);
});
test('CLI는 호출 위치와 관계없이 같은 ID와 지시문을 제공한다', () => {
  const cli = path.join(root, 'tools/catalog.mjs');
  const fromOutside = execFileSync(process.execPath, [cli, 'show', cases[0].id, '--json'], { cwd: tmpdir(), encoding: 'utf8' });
  assert.deepEqual(JSON.parse(fromOutside), cases[0]);
  const prompt = execFileSync(process.execPath, [cli, 'show', cases[0].id, '--prompt'], { cwd: tmpdir(), encoding: 'utf8' }).trimEnd();
  assert.equal(prompt, promptFor(cases[0]).trimEnd());
  const invalid = spawnSync(process.execPath, [cli, 'show', 'ui-9999'], { encoding: 'utf8' });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /등록되지 않은 사례/);
  const badLimit = spawnSync(process.execPath, [cli, 'search', '달력', '--limit', '-1'], { encoding: 'utf8' });
  assert.equal(badLimit.status, 1);
});
test('개별 명세와 JSON의 분류 및 모션이 일치한다', () => {
  for (const item of cases) {
    const md = read(item.paths.specification);
    assert.ok(md.includes(item.motion.instruction));
    assert.ok(md.includes('분류: ' + item.category));
    assert.ok(md.includes('../' + item.paths.preview));
    assert.ok(md.includes('프로젝트 검증 상태: 미실시'));
  }
});
