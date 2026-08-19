# Sunset Dino Run

Chrome의 오프라인 공룡 러너에서 영감을 받아 독자적으로 제작한 모던 선셋 픽셀 게임입니다. 석양·구름·산맥·지면부터 공룡·장애물·점수·버튼까지 모두 실제 HTML 요소로 구성하고, 실험적인 **HTML-in-Canvas API**로 Canvas 안에 합성합니다.

Canvas 2D 컨텍스트는 화면을 직접 그리지 않고 살아 있는 HTML 레이어를 여러 번 샘플링하고 재합성합니다.

- **DOM Scope**: 동일한 배경·공룡·장애물 HTML 노드를 축소·클리핑해 두 번째 실시간 카메라로 표시합니다.
- **Temporal Echo**: 공룡 DOM 하나를 서로 다른 위치·투명도·합성 모드로 반복 샘플링해 시간 잔상을 만듭니다.
- **Interactive HTML HUD**: Canvas 안의 실제 `button`, `output`, `meter`가 접근성과 포커스를 유지하며 잔상과 장애물 근접도를 제어·표시합니다.
- 실제 상호작용 위치는 `drawElementImage()`가 반환한 `DOMMatrix`로 동기화하고, 장식용 재샘플은 원래 히트 영역을 움직이지 않습니다.

> 이 프로젝트는 폴백 없는 실험 데모입니다. 일반 Chrome에서는 게임 대신 활성화 안내 화면이 표시됩니다.

## 실행 조건

1. Chrome Canary 149 이상을 설치합니다.
2. `chrome://flags/#canvas-draw-element`를 엽니다.
3. **Canvas Draw Element**를 Enabled로 바꾸고 Canary를 재시작합니다.

자세한 내용은 [Chrome의 HTML-in-Canvas 오리진 트라이얼 안내](https://developer.chrome.com/blog/html-in-canvas-origin-trial)를 참고하세요.

## 조작

- `Space`, `↑`, `W`: 시작 / 점프
- `↓`, `S`: 숙이기
- 화면 내 JUMP / DUCK 버튼: 터치 조작
- 탭이 백그라운드로 이동하면 자동 일시정지

## 로컬 개발

Node.js 20.19 이상이 필요합니다.

```bash
npm install
npm run dev
```

검증 명령:

```bash
npm run typecheck
npm test
npm run build
```

## 핵심 구조

- `src/game/engine.ts`: 프레임워크와 DOM에 독립적인 게임 상태·물리·충돌 로직
- `src/game/htmlCanvas.ts`: 실험 API 기능 감지와 DOMMatrix 동기화 어댑터
- `src/game/renderer.ts`: HTML 배경·게임 오브젝트·UI 레이어의 Canvas 합성
- `src/main.ts`: DOM 구성, 입력, 게임 루프, 최고 점수 저장

최고 점수는 현재 브라우저의 `dino-run:high-score:v1` 로컬 스토리지 키에만 저장됩니다.

## 배포

GitHub `main` 브랜치는 Vercel 프로덕션 환경에 연결됩니다. 다른 브랜치와 Pull Request는 Vercel 프리뷰 배포를 생성합니다. `.vercel` 디렉터리와 환경 파일은 저장소에 커밋하지 않습니다.

## 라이선스

공개 저장소이지만 별도 오픈소스 라이선스는 부여하지 않았습니다.
