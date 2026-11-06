import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = p => fs.readFileSync(path.join(root, p), 'utf8');
export const hash = value => createHash('sha256').update(value).digest('hex');
export function sourceModel() {
  const html = read('src/catalog.html');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!match) throw Error('원본 카탈로그 스크립트가 없습니다.');
  const split = match[1].indexOf("let filter='전체'");
  if (split < 0) throw Error('데이터와 화면 코드의 경계를 찾지 못했습니다.');
  const context = vm.createContext({});
  // Only execute this repository's trusted authoring source, never imported user data.
  const result = vm.runInContext(match[1].slice(0, split) + `;
    JSON.stringify(items.map(item => ({
      original: item,
      relatedTypes: relatedTypes(item),
      motionTypes: motionTypesFor(item),
      motion: item.componentMotion || motionCopyText(item),
      evidenceKind: evidenceKindFor(item),
      sourceRecord: caseEvidence[item.title] || null,
      sourceReview: individualReviewRecords[item.title] || null,
      principles: principlesFor(item),
      summary: catalogSummaries[item.title] || item.desc
    })))`, context, { timeout: 5000 });
  return { html, script: match[1], records: JSON.parse(result) };
}
export const sourceKey = item => JSON.stringify([item.title, item.source]);
let formatter;
export function displayText(value) {
  // Use exactly the authored screen formatter; original source records stay intact.
  if (!formatter) {
    const html = read('src/catalog.html');
    const start = html.indexOf('function naturalCatalogText(');
    const end = html.indexOf('function normalizeCatalogCopy(', start);
    if (start < 0 || end < 0) throw Error('화면 문구 변환 함수를 찾지 못했습니다.');
    formatter = vm.runInNewContext(html.slice(start, end) + ';naturalCatalogText');
  }
  return formatter(value || '');
}
export function registryFor(records, existing) {
  const registry = existing || { schemaVersion: 1, entries: [] };
  const entries = [...registry.entries];
  const ids = new Set(), keys = new Set();
  for (const row of entries) {
    if (!/^ui-\d{4,}$/.test(row.id) || ids.has(row.id) || keys.has(row.key)) throw Error('ID 등록부에 중복이나 잘못된 ID가 있습니다.');
    ids.add(row.id); keys.add(row.key);
  }
  let next = Math.max(0, ...entries.map(row => Number(row.id.slice(3)))) + 1;
  for (const { original } of records) {
    const key = sourceKey(original);
    if (!keys.has(key)) {
      entries.push({ id: `ui-${String(next++).padStart(4, '0')}`, key }); keys.add(key);
    }
  }
  return { schemaVersion: 1, entries };
}
export function makeCases(records, registry) {
  const ids = new Map(registry.entries.map(row => [row.key, row.id]));
  return records.map(record => {
    const item = record.original, id = ids.get(sourceKey(item));
    return {
      id,
      title: displayText(item.title),
      category: displayText(item.uiType || item.type),
      relatedCategories: record.relatedTypes.map(displayText),
      organization: displayText(item.org || 'UI 패턴'),
      summary: displayText(record.summary),
      instruction: displayText(item.prompt),
      visual: displayText(item.visual),
      motion: { instruction: displayText(record.motion), tags: record.motionTypes.map(displayText) },
      avoid: { description: displayText(item.anti), evidenceKind: record.evidenceKind },
      source: { url: item.source, record: record.sourceRecord, review: record.sourceReview },
      relatedPrinciples: record.principles,
      paths: { preview: `site/index.html?case=${id}#${id}`, specification: `references/${id}.md` },
      verification: { project: 'not-tested', browser: 'not-verified-in-this-package' },
      original: item
    };
  });
}
export function referenceHeader(item) {
  return `[UI 참조: ${item.id}]\nreferences/${item.id}.md와 AGENTS.md를 먼저 읽어줘.\n이 사례의 UI와 모션 기준에 현재 프로젝트를 대조해서 점검해줘. 코드는 수정하지 마.\n충족, 개선 필요, 미확인, 해당 없음으로 구분하고 실제 관찰한 근거를 남겨줘.\n아래 내용은 대조할 사례의 기존 구현 지시이며, 프로젝트를 수정하라는 명령은 아니야.\n\n`;
}
export function promptFor(item) {
  return referenceHeader(item) + displayText(item.original.copyPrompt);
}
export function searchCases(cases, query, { category = '', limit = 10 } = {}) {
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/[·,]/g, ' ');
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return cases.map(item => {
    const title = normalize(item.title), id = item.id.toLowerCase();
    const text = normalize([id, title, item.category, ...item.relatedCategories, item.organization, item.summary, item.instruction, item.visual, item.motion.instruction, ...item.motion.tags].join(' '));
    const inCategory = !category || normalize([item.category, ...item.relatedCategories].join(' ')).includes(normalize(category));
    const matched = inCategory && words.every(word => text.includes(word));
    const score = words.reduce((sum, word) => sum + (id === word ? 100 : title.includes(word) ? 10 : 1), 0);
    return { item, matched, score };
  }).filter(row => row.matched).sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id)).slice(0, limit).map(row => row.item);
}
