#!/usr/bin/env node
import { read, searchCases, promptFor } from './model.mjs';
const args = process.argv.slice(2), command = args.shift();
const help = `사용법:
  node tools/catalog.mjs search "달력" [--category "날짜"] [--limit 5] [--json]
  node tools/catalog.mjs show ui-0001 [--json | --prompt]
  node tools/catalog.mjs categories [--json]
명령은 어떤 작업 디렉터리에서도 실행할 수 있습니다. 경로는 이 스크립트를 기준으로 찾습니다.`;
function fail(message) { console.error(message); process.exitCode = 1; }
function run() {
  if (!command || command === '--help' || command === 'help') { console.log(help); return; }
  const flags = new Set(), values = {}, words = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--category' || arg === '--limit') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error(arg + ' 값이 필요합니다.');
      values[arg] = args[++i];
    } else if (arg === '--json' || arg === '--prompt') flags.add(arg);
    else if (arg.startsWith('--')) throw Error('알 수 없는 옵션: ' + arg);
    else words.push(arg);
  }
  const { cases } = JSON.parse(read('data/cases.json'));
  if (command === 'search') {
    const limit = values['--limit'] === undefined ? 10 : Number(values['--limit']);
    if (!Number.isInteger(limit) || limit < 1 || limit > 278) throw Error('--limit 값은 1~278 사이의 정수여야 합니다.');
    if (!words.join(' ').trim() && !values['--category']) throw Error('검색어 또는 --category가 필요합니다.');
    const found = searchCases(cases, words.join(' '), { category: values['--category'], limit });
    const result = found.map(({ id, title, category, summary, motion, paths }) => ({ id, title, category, summary, motionTags: motion.tags, ...paths }));
    if (flags.has('--json')) console.log(JSON.stringify(result, null, 2));
    else if (!result.length) console.log('일치하는 사례가 없습니다. 검색어를 줄이거나 다른 분류를 확인하세요.');
    else console.log(result.map(x => `${x.id}  ${x.title}\n  ${x.category}\n  ${x.summary}\n  ${x.specification}\n  ${x.preview}`).join('\n\n'));
  } else if (command === 'show') {
    if (words.length !== 1) throw Error('하나의 사례 ID를 지정하세요.');
    const item = cases.find(x => x.id === words[0]);
    if (!item) throw Error('등록되지 않은 사례 ID: ' + words[0]);
    if (flags.has('--json') && flags.has('--prompt')) throw Error('--json과 --prompt 중 하나를 선택하세요.');
    console.log(flags.has('--json') ? JSON.stringify(item, null, 2) : flags.has('--prompt') ? promptFor(item) : read(item.paths.specification));
  } else if (command === 'categories') {
    const categories = JSON.parse(read('data/categories.json'));
    console.log(flags.has('--json') ? JSON.stringify(categories, null, 2) : categories.map(x => `${x.name}: ${x.ids.length}개`).join('\n'));
  } else throw Error('알 수 없는 명령입니다.\n' + help);
}
try { run(); } catch (error) { fail(error.message); }
