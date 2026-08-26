import "./app.css";
import {
  createGameState,
  formatScore,
  jump,
  pauseGame,
  resumeGame,
  setDucking,
  startGame,
  tickGame,
  type GamePhase,
  type GameState,
} from "./game/engine";
import { createCanvasRenderer } from "./game/canvasRenderer";

type Route = "/" | "/game" | "/leaderboard" | "/settings";
type PlayerId = "1p" | "2p";

interface PlayerController {
  id: PlayerId;
  state: GameState;
  previousPhase: GamePhase;
  previousBest: number;
  isNewBest: boolean;
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  score: HTMLElement;
  best: HTMLElement;
  speed: HTMLElement;
  overlay: HTMLElement;
  overlayTitle: HTMLElement;
  overlayCopy: HTMLElement;
  startButton: HTMLButtonElement;
  jumpButton: HTMLButtonElement;
  duckButton: HTMLButtonElement;
  render: (state: GameState) => void;
}

const HIGH_SCORE_KEYS: Record<PlayerId, string> = {
  "1p": "dino-run:high-score:v1",
  "2p": "dino-run:high-score:2p:v1",
};

const app = document.querySelector<HTMLElement>("#app")!;
if (!app) throw new Error("App root is unavailable.");

let cleanupRoute: (() => void) | undefined;

function readBestScore(player: PlayerId): number {
  try {
    const score = Number.parseInt(
      localStorage.getItem(HIGH_SCORE_KEYS[player]) ?? "0",
      10,
    );
    return Number.isFinite(score) ? Math.max(0, score) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(player: PlayerId, score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEYS[player], String(score));
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

function requireElement<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

function getRoute(pathname = window.location.pathname): Route {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (
    normalized === "/game" ||
    normalized === "/leaderboard" ||
    normalized === "/settings"
  ) {
    return normalized;
  }
  return "/";
}

function homeLink(): string {
  return `
    <a class="home-link" href="/" data-route aria-label="메인으로 돌아가기">
      <span aria-hidden="true">←</span><b>메인</b>
    </a>
  `;
}

function renderHome(): void {
  document.title = "공룡 게임";
  app.innerHTML = `
    <section class="home-view">
      <div class="home-copy">
        <p class="eyebrow">2 PLAYER RUNNER</p>
        <h1>같이 달릴<br>준비됐나요?</h1>
        <p>한 화면에서 나란히 기록에 도전하는 2인용 공룡 러너입니다.</p>
      </div>
      <nav class="route-grid" aria-label="메인 메뉴">
        <a class="route-card route-card-primary" href="/game" data-route>
          <span class="route-number">01</span>
          <span><b>게임 시작</b><small>1P · 2P 분할 플레이</small></span>
          <i aria-hidden="true">→</i>
        </a>
        <a class="route-card" href="/leaderboard" data-route>
          <span class="route-number">02</span>
          <span><b>리더보드</b><small>로컬 최고 기록</small></span>
          <i aria-hidden="true">→</i>
        </a>
        <a class="route-card" href="/settings" data-route>
          <span class="route-number">03</span>
          <span><b>설정</b><small>게임 환경 설정</small></span>
          <i aria-hidden="true">→</i>
        </a>
      </nav>
      <div class="home-sun" aria-hidden="true"></div>
      <div class="home-ground" aria-hidden="true"></div>
    </section>
  `;
}

function playerMarkup(player: PlayerId): string {
  const isPlayerOne = player === "1p";
  const playerLabel = isPlayerOne ? "1P" : "2P";
  const jumpKey = isPlayerOne ? "W" : "↑";
  const duckKey = isPlayerOne ? "S" : "↓";
  return `
    <section class="player-stage player-${player}" data-player="${player}" aria-label="${playerLabel} 게임 화면">
      <canvas class="game-canvas" tabindex="0" aria-label="${playerLabel} 공룡 러너 캔버스">
        브라우저가 Canvas를 지원해야 게임을 플레이할 수 있습니다.
      </canvas>
      <div class="player-badge" aria-hidden="true"><b>${playerLabel}</b><span>${isPlayerOne ? "W / S" : "↑ / ↓"}</span></div>
      <div class="hud" aria-live="polite">
        <div class="hud-item"><span>거리</span><strong data-score>00000</strong></div>
        <div class="hud-item hud-best"><span>최고</span><strong data-best>00000</strong></div>
        <div class="speed-chip"><i></i><span data-speed>34</span> KM/H</div>
      </div>
      <div class="game-overlay is-visible" data-overlay>
        <h2 data-overlay-title>${playerLabel} 준비</h2>
        <p data-overlay-copy>${jumpKey} 점프 · ${duckKey} 숙이기</p>
        <button data-start type="button"><span>달리기</span><b>${jumpKey}</b></button>
      </div>
      <div class="mobile-controls" aria-label="${playerLabel} 터치 조작">
        <button data-duck type="button" aria-label="${playerLabel} 숙이기"><b>↓</b><span>숙이기</span></button>
        <button data-jump type="button" aria-label="${playerLabel} 점프"><b>↑</b><span>점프</span></button>
      </div>
    </section>
  `;
}

function createPlayerController(player: PlayerId): PlayerController {
  const stage = requireElement<HTMLElement>(`.player-${player}`, app);
  const canvas = requireElement<HTMLCanvasElement>(".game-canvas", stage);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");
  const bestScore = readBestScore(player);

  return {
    id: player,
    state: createGameState(bestScore),
    previousPhase: "ready",
    previousBest: bestScore,
    isNewBest: false,
    canvas,
    stage,
    score: requireElement("[data-score]", stage),
    best: requireElement("[data-best]", stage),
    speed: requireElement("[data-speed]", stage),
    overlay: requireElement("[data-overlay]", stage),
    overlayTitle: requireElement("[data-overlay-title]", stage),
    overlayCopy: requireElement("[data-overlay-copy]", stage),
    startButton: requireElement("[data-start]", stage),
    jumpButton: requireElement("[data-jump]", stage),
    duckButton: requireElement("[data-duck]", stage),
    render: createCanvasRenderer(canvas, context),
  };
}

function updatePlayerInterface(player: PlayerController): void {
  const { state } = player;
  const playerLabel = player.id === "1p" ? "1P" : "2P";
  const jumpKey = player.id === "1p" ? "W" : "↑";
  const duckKey = player.id === "1p" ? "S" : "↓";
  player.score.textContent = formatScore(state.score);
  player.best.textContent = formatScore(state.bestScore);
  player.speed.textContent = String(Math.round(state.speed / 10));
  player.stage.dataset.phase = state.phase;
  player.overlay.classList.toggle("is-visible", state.phase !== "running");

  if (state.phase === "ready") {
    player.overlayTitle.textContent = `${playerLabel} 준비`;
    player.overlayCopy.textContent = `${jumpKey} 점프 · ${duckKey} 숙이기`;
    player.startButton.innerHTML = `<span>달리기</span><b>${jumpKey}</b>`;
  } else if (state.phase === "paused") {
    player.overlayTitle.textContent = `${playerLabel} 일시정지`;
    player.overlayCopy.textContent = "같은 위치에서 다시 이어집니다.";
    player.startButton.innerHTML = `<span>계속하기</span><b>${jumpKey}</b>`;
  } else if (state.phase === "gameOver") {
    player.overlayTitle.textContent = `${formatScore(state.score)}점`;
    player.overlayCopy.textContent = player.isNewBest
      ? `${playerLabel}의 새로운 최고 기록입니다.`
      : `최고 기록 ${formatScore(state.bestScore)}점`;
    player.startButton.innerHTML = `<span>다시 달리기</span><b>${jumpKey}</b>`;
  }
}

function beginOrResume(player: PlayerController): void {
  if (player.state.phase === "paused") {
    resumeGame(player.state);
  } else {
    startGame(player.state);
    player.isNewBest = false;
  }
  updatePlayerInterface(player);
  player.canvas.focus({ preventScroll: true });
}

function requestJump(player: PlayerController): void {
  if (player.state.phase === "running") jump(player.state);
  else beginOrResume(player);
}

function mountGame(): () => void {
  document.title = "게임 · 공룡 게임";
  app.innerHTML = `
    <main class="game-view">
      ${homeLink()}
      <div class="split-arena">
        ${playerMarkup("1p")}
        ${playerMarkup("2p")}
      </div>
    </main>
  `;

  const players = [createPlayerController("1p"), createPlayerController("2p")];
  let previousTime = performance.now();
  let animationFrame = 0;

  const resizeObservers = players.map((player) => {
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(entry.contentRect.width * ratio));
      const height = Math.max(1, Math.round(entry.contentRect.height * ratio));
      if (player.canvas.width !== width || player.canvas.height !== height) {
        player.canvas.width = width;
        player.canvas.height = height;
      }
      player.render(player.state);
    });
    observer.observe(player.canvas);
    return observer;
  });

  const gameLoop = (now: number): void => {
    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;
    for (const player of players) {
      player.previousPhase = player.state.phase;
      player.previousBest = player.state.bestScore;
      tickGame(player.state, deltaSeconds);
      if (player.previousPhase === "running" && player.state.phase === "gameOver") {
        player.isNewBest = player.state.bestScore > player.previousBest;
        saveBestScore(player.id, player.state.bestScore);
      }
      updatePlayerInterface(player);
      player.render(player.state);
    }
    animationFrame = requestAnimationFrame(gameLoop);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLButtonElement && event.code === "Space") return;
    const player = event.code === "KeyW" || event.code === "KeyS"
      ? players[0]
      : event.code === "ArrowUp" || event.code === "ArrowDown"
        ? players[1]
        : undefined;
    if (!player) return;
    event.preventDefault();
    if (event.code === "KeyW" || event.code === "ArrowUp") {
      if (!event.repeat) requestJump(player);
    } else {
      setDucking(player.state, true);
    }
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code === "KeyS") setDucking(players[0]!.state, false);
    if (event.code === "ArrowDown") setDucking(players[1]!.state, false);
  };

  const handleVisibility = (): void => {
    if (document.hidden) players.forEach((player) => pauseGame(player.state));
    previousTime = performance.now();
    players.forEach(updatePlayerInterface);
  };

  for (const player of players) {
    player.startButton.addEventListener("click", () => beginOrResume(player));
    player.jumpButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      requestJump(player);
    });
    player.duckButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      setDucking(player.state, true);
      player.duckButton.setPointerCapture(event.pointerId);
    });
    for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
      player.duckButton.addEventListener(eventName, () => setDucking(player.state, false));
    }
    updatePlayerInterface(player);
    player.render(player.state);
  }

  window.addEventListener("keydown", handleKeyDown, { passive: false });
  window.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", handleVisibility);
  animationFrame = requestAnimationFrame(gameLoop);

  return () => {
    cancelAnimationFrame(animationFrame);
    resizeObservers.forEach((observer) => observer.disconnect());
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}

function renderLeaderboard(): void {
  document.title = "리더보드 · 공룡 게임";
  const scores = [
    { player: "1P", score: readBestScore("1p"), tone: "coral" },
    { player: "2P", score: readBestScore("2p"), tone: "teal" },
  ].sort((a, b) => b.score - a.score);
  app.innerHTML = `
    <main class="subpage-view">
      ${homeLink()}
      <header class="subpage-header">
        <p class="eyebrow">LOCAL RECORDS</p>
        <h1>리더보드</h1>
        <p>이 기기에서 달성한 최고 기록입니다.</p>
      </header>
      <ol class="leaderboard-list">
        ${scores.map((entry, index) => `
          <li class="score-row score-${entry.tone}">
            <span class="rank">${String(index + 1).padStart(2, "0")}</span>
            <b>${entry.player}</b>
            <strong>${formatScore(entry.score)}</strong>
          </li>
        `).join("")}
        <li class="score-row is-placeholder"><span class="rank">03</span><b>빈 자리</b><strong>-----</strong></li>
      </ol>
      <p class="mock-note">온라인 순위와 플레이어 이름은 다음 단계에서 추가됩니다.</p>
    </main>
  `;
}

function renderSettings(): void {
  document.title = "설정 · 공룡 게임";
  app.innerHTML = `
    <main class="subpage-view">
      ${homeLink()}
      <header class="subpage-header">
        <p class="eyebrow">PREFERENCES</p>
        <h1>설정</h1>
        <p>플레이 환경을 조정하는 화면입니다.</p>
      </header>
      <section class="settings-list" aria-label="게임 설정 목업">
        <label class="setting-row"><span><b>화면 흔들림</b><small>충돌 시 화면 효과</small></span><input type="checkbox" checked></label>
        <label class="setting-row"><span><b>속도 표시</b><small>게임 중 현재 속도 표시</small></span><input type="checkbox" checked></label>
        <label class="setting-row"><span><b>고대비 모드</b><small>장애물 가시성 강화</small></span><input type="checkbox"></label>
      </section>
      <p class="mock-note">설정 저장과 세부 옵션은 다음 단계에서 연결됩니다.</p>
    </main>
  `;
}

function renderRoute(): void {
  cleanupRoute?.();
  cleanupRoute = undefined;
  const route = getRoute();
  if (route === "/game") cleanupRoute = mountGame();
  else if (route === "/leaderboard") renderLeaderboard();
  else if (route === "/settings") renderSettings();
  else renderHome();
  window.scrollTo(0, 0);
}

document.addEventListener("click", (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-route]");
  if (!link || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  window.history.pushState({}, "", link.href);
  renderRoute();
});

window.addEventListener("popstate", renderRoute);
window.addEventListener("pagehide", () => cleanupRoute?.(), { once: true });
renderRoute();
