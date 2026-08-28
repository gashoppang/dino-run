# 공룡 러너

크롬 오프라인 공룡 게임에서 영감을 받아 독자적으로 만든 2인용 픽셀 러너입니다. 별도 실험 기능 없이 표준 **Canvas 2D API**로 동작하므로 최신 Chrome, Edge, Firefox, Safari에서 바로 플레이할 수 있습니다.

## 주요 기능

- 메인, 게임, 리더보드, 설정의 4개 화면
- 상단 1P와 하단 2P로 나뉜 독립 게임 보드
- 선인장과 비행 장애물, 점프와 숙이기, 점진적인 속도 증가
- 플레이어별 키보드와 터치 조작, 최고 기록 저장
- 시작 전 이름 입력, 동시 라운드 시작과 점수순 리더보드
- 반응형 Canvas와 최대 2배 기기 픽셀 비율 렌더링
- 움직이는 노을, 다중 시차 산맥, 속도선과 먼지 파티클
- 시작 전 이름 입력과 이름별 최고 점수

## 조작

- 공통 `Space`: 두 플레이어 동시 시작 / 재시작
- 1P `W`: 점프, `S`: 숙이기
- 2P `↑`: 점프, `↓`: 숙이기
- 화면의 JUMP / DUCK 버튼: 터치 조작

## 로컬 실행

Node.js 20.19 이상이 필요합니다.

```bash
npm install
npm run dev
```

DB API까지 함께 실행하려면 `.env.example`을 참고해 `.env`에 `DATABASE_URL`을 설정한 뒤 Vercel 개발 서버를 사용합니다.

```bash
npx vercel@59.5.0 dev --listen 5173
```

리더보드는 PlanetScale Postgres의 `leaderboard_scores` 테이블을 사용합니다. API에는 테이블 읽기·쓰기 권한만 부여하며, 브라우저의 이전 로컬 리더보드 값은 사용하지 않고 삭제합니다.

검증:

```bash
npm run typecheck
npm test
npm run build
```

## 구조

- `src/game/engine.ts`: 게임 상태, 물리, 장애물 생성, 충돌 판정
- `src/game/canvasRenderer.ts`: 표준 Canvas 2D 배경과 캐릭터 렌더링
- `src/leaderboard.ts`: 이름 정규화와 서버 리더보드 기록
- `src/app.ts`: 4개 화면 라우팅, 2인용 입력, 게임 루프, 점수 저장
- `src/app.css`: 반응형 화면과 컨트롤 스타일

## 배포

GitHub `main` 브랜치가 Vercel 프로덕션 환경에 연결되어 있습니다. 다른 브랜치와 Pull Request는 프리뷰 배포를 생성합니다.

## 라이선스

공개 저장소이지만 별도 오픈소스 라이선스는 부여하지 않았습니다.
