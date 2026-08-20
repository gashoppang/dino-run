# Dino Afterglow

크롬 오프라인 공룡 게임에서 영감을 받아 독자적으로 만든 모던 픽셀 러너입니다. 별도 실험 기능 없이 표준 **Canvas 2D API**로 동작하므로 최신 Chrome, Edge, Firefox, Safari에서 바로 플레이할 수 있습니다.

## 주요 기능

- 선인장과 비행 장애물, 점프와 숙이기, 점진적인 속도 증가
- 키보드와 터치 조작, 탭 비활성화 시 자동 일시정지
- 반응형 16:9 Canvas와 최대 2배 기기 픽셀 비율 렌더링
- 움직이는 노을, 다중 시차 산맥, 속도선과 먼지 파티클
- `dino-run:high-score:v1` 키를 사용하는 브라우저 로컬 최고 점수

## 조작

- `Space`, `↑`, `W`: 시작 / 점프
- `↓`, `S`: 숙이기
- 화면의 JUMP / DUCK 버튼: 터치 조작

## 로컬 실행

Node.js 20.19 이상이 필요합니다.

```bash
npm install
npm run dev
```

검증:

```bash
npm run typecheck
npm test
npm run build
```

## 구조

- `src/game/engine.ts`: 게임 상태, 물리, 장애물 생성, 충돌 판정
- `src/game/canvasRenderer.ts`: 표준 Canvas 2D 배경과 캐릭터 렌더링
- `src/app.ts`: 일반 HTML 인터페이스, 입력, 게임 루프, 점수 저장
- `src/app.css`: 반응형 화면과 컨트롤 스타일

## 배포

GitHub `main` 브랜치가 Vercel 프로덕션 환경에 연결되어 있습니다. 다른 브랜치와 Pull Request는 프리뷰 배포를 생성합니다.

## 라이선스

공개 저장소이지만 별도 오픈소스 라이선스는 부여하지 않았습니다.
