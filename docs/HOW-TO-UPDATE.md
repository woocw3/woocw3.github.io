# 사이트 업데이트 방법 (chungwonwoo.com)

2026-10-30 정리. 대부분은 파일 하나만 고쳐서 GitHub에 올리면(push) 자동으로 반영됩니다.

## 새 논문 추가

1. `static/woo-publications.bib` 맨 아래에 BibTeX 항목을 붙여 넣습니다.
2. 선택 필드(넣으면 페이지가 더 좋아집니다):
   - `topic` : 분류. `carbon`, `innovation`, `energy`, `policy`, `it`, `esg` 중 하나 (없으면 "Other topics")
   - `title_en`, `journal_en` : 국문 논문의 영문 제목·학술지명 (영문판 목록에 쓰임)
   - `tldr` : 한두 문장 요약 / `abstract` : 영문 초록 / `abstract_ko` : 국문 초록 / `keywords`
   - `slug` : 주소 이름 (없으면 제목으로 자동 생성)
3. 올리면 배포 때 자동으로:
   - 영문·국문 메인의 논문 목록, `/papers/` 색인, `sitemap-papers.xml`, `llms.txt`, 논문 수가 갱신되고
   - 해당 논문의 요약 페이지(`/papers/<slug>.html`)가 자동 생성되며
   - IndexNow로 빙·네이버에 새 페이지를 알립니다.

자동 생성 페이지를 손으로 다듬고 싶으면, 그 파일 맨 위의 `<!-- generated:paper ... -->` 주석을 지우고 수정하세요. 그 뒤로는 생성기가 덮어쓰지 않습니다.

기존 42편의 표시 제목(영문 번역 제목 등)은 `data/paper-meta.json`에 있습니다.

## 자동으로 돌아가는 것

| 항목 | 주기 | 방법 |
|---|---|---|
| 피인용 수·h-index | 매주 (Aside 정기 작업) + 매일 빌드 | `scripts/fetch-metrics.mjs`가 Google Scholar에서 읽어 `data/metrics.json` 갱신 |
| 최신 영상 | 매일 06:30 빌드 | 유튜브 채널 RSS. 수업 녹화본(날짜·주차 제목)은 자동 제외. 공개 영상이 없으면 섹션이 숨겨짐 |
| 검색엔진 통보 | push할 때마다 | `scripts/indexnow.mjs` |
| NAS 백업 | 매일 21:00 (Aside 정기 작업) | `SynologyDrive\3. project\website-backup` |

## 직접 실행해 보기 (선택)

```
node scripts/fetch-metrics.mjs   # 지표 갱신
node scripts/build-site.mjs      # 목록·색인·페이지 재생성 (--offline: 유튜브 조회 생략)
```

## 정리된 것

- Hugo Blox가 자동으로 만들던 `/publication/` 101건과 저자·태그 페이지는 삭제/검색 제외. 원본 110건 목록은 `archive/all-publications-2026-10.bib`에 보관.
- Hugo Blox 주간 자동 업그레이드는 수동 실행으로 변경 (Actions 탭 → Upgrade HugoBlox → Run workflow).
