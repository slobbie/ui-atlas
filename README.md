# UI Atlas

> 현재 정리 중인 사례집입니다. 실제 프로젝트에서 기준의 적합성을 확인할 예정입니다.

사람은 UI를 직접 보고 조작한 뒤 원하는 사례를 지정합니다. AI는 같은 사례 ID의 기준을 읽고 프로젝트의 UI와 모션을 대조해 점검합니다.

기존 278개 UI와 모션 사례를 보존했습니다. 실제 프로젝트 검증은 아직 진행하지 않았습니다.

## 사람이 사용할 때

저장소 루트에서 로컬 서버를 실행하고 `http://localhost:5501/site/`를 엽니다.

```sh
python3 -m http.server 5501 --bind 127.0.0.1
```

1. 분류나 검색으로 필요한 UI를 찾고 미리보기를 조작합니다.
2. 여러 후보는 비교 기능으로 나란히 확인합니다.
3. 카드의 `ui-0001` 같은 고정 ID로 대상을 지정합니다. ID 링크를 누르면 해당 사례만 보이는 주소를 얻습니다.
4. 점검할 사례의 프롬프트를 복사해 AI에 전달합니다. 복사 내용에는 사례 ID와 먼저 읽어야 할 명세 경로가 포함됩니다. 여러 사례를 함께 복사해도 각각의 ID가 들어갑니다.

[첫 사례의 구현 기준](references/ui-0001.md)과 [카탈로그](site/index.html)는 같은 원본에서 생성됩니다. GitHub의 파일 화면에서는 HTML을 실행하지 않으므로, 화면 조작은 로컬 서버에서 합니다.

## AI가 사용할 때

시작 문서는 [AGENTS.md](AGENTS.md)입니다. ID를 지정받으면 개별 명세를 읽고, ID가 없으면 검색한 뒤 후보를 고릅니다.

```sh
node tools/catalog.mjs search "달력" --limit 5
node tools/catalog.mjs show ui-0001
node tools/catalog.mjs show ui-0001 --prompt
```

검색 명령은 외부 프로젝트에서도 스크립트의 실제 경로로 실행할 수 있습니다. Node 없이 사용할 때는 [검색 색인](data/index.json)과 `references` 문서를 읽습니다.

## 실제 프로젝트에서 먼저 써보기

[프로젝트 연결 안내](docs/integration.md)에 AI에게 전달할 문장과 프로젝트 규칙에 넣을 예시가 있습니다. 이 패키지 생성 과정에서는 외부 프로젝트에 접근하거나 파일을 바꾸지 않습니다.

[점검 기록 양식](docs/project-validation.md)에 대조한 ID와 확인한 화면, 실제 동작, 개선할 부분을 기록할 수 있습니다. 프로젝트에 맞지 않은 부분도 해당 ID로 피드백하면 됩니다.

## 저장소 구조

```text
AGENTS.md                 AI가 먼저 읽는 규칙
src/catalog.html          현재의 단일 편집 원본
src/support/              기존 미리보기의 이미지와 연결 자료
site/index.html           사람이 보는 전체 카탈로그
data/index.json           가벼운 검색 색인
data/cases.json           278개 상세 명세와 원본 데이터
data/ids.json             순서가 바뀌어도 유지하는 고정 ID
data/manifest.json        원본 해시와 생성 정보
references/ui-0001.md      사례별 구현 기준, 총 278개
docs/                     연결 방법과 적용 기록 양식
tools/                    생성, 검색, 무결성 검사
```

현재는 기존 동작을 보존하기 위해 HTML을 편집 원본으로 사용합니다. 검색 데이터와 Markdown을 따로 수정하지 않습니다. `npm run build` 한 번으로 같은 원본에서 함께 생성합니다. 외부 npm 패키지는 설치하지 않아도 됩니다.

```sh
npm run build
npm run check
npm test
```

위 검사는 데이터 보존과 ID 연결, 검색과 명세 전달을 확인합니다. 실제 화면 조작이나 사용자의 프로젝트 검증을 대신하지 않습니다.

## GitHub에 올릴 범위

이 폴더 전체가 독립 저장소의 루트가 되도록 정리했습니다. `site`, `data`, `references` 생성 결과도 함께 포함하면, 받는 사람이 빌드하지 않고 열거나 AI에 읽힐 수 있습니다. 로컬 서버는 저장소 루트에서 실행해야 미리보기와 개별 명세 링크가 모두 연결됩니다.

저장소: [slobbie/ui-atlas](https://github.com/slobbie/ui-atlas). 개발 중인 자료이며 정식 배포본은 아닙니다. 기존 출처는 [출처 안내](docs/sources.md)에 정리했습니다.
