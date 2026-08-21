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

const HIGH_SCORE_KEY = "dino-run:high-score:v1";

function readBestScore(): number {
  try {
    const score = Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0", 10);
    return Number.isFinite(score) ? Math.max(0, score) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

document.querySelector<HTMLElement>("#app")!.innerHTML = `
  <section class="game-page" aria-label="공룡 러너 게임">
    <article class="game-card">
      <div class="game-stage" id="game-stage">
        <canvas id="game-canvas" width="960" height="540" tabindex="0" aria-label="공룡 러너 게임 화면">
          브라우저가 Canvas를 지원해야 게임을 플레이할 수 있습니다.
        </canvas>

        <div class="hud" aria-live="polite">
          <div class="hud-item">
            <span>DISTANCE</span>
            <strong id="score">00000</strong>
          </div>
          <div class="hud-item hud-best">
            <span>PERSONAL BEST</span>
            <strong id="best-score">00000</strong>
          </div>
          <div class="speed-chip"><i></i><span id="speed">34</span> KM/H</div>
        </div>

        <div class="game-overlay is-visible" id="game-overlay" role="dialog" aria-modal="false" aria-labelledby="overlay-title">
          <h2 id="overlay-title">달릴 준비됐나요?</h2>
          <p id="overlay-copy">선인장은 뛰어넘고, 익룡 아래에서는 몸을 낮추세요.</p>
          <button id="start-button" type="button"><span>게임 시작</span><b>SPACE</b></button>
        </div>

        <div class="mobile-controls" aria-label="터치 조작">
          <button id="duck-button" type="button" aria-label="숙이기"><b>↓</b><span>DUCK</span></button>
          <button id="jump-button" type="button" aria-label="점프"><b>↑</b><span>JUMP</span></button>
        </div>
      </div>
    </article>
  </section>
`;

const canvas = requireElement<HTMLCanvasElement>("#game-canvas");
const context = canvas.getContext("2d");
if (!context) throw new Error("Canvas 2D context is unavailable.");

const stage = requireElement<HTMLElement>("#game-stage");
const scoreElement = requireElement<HTMLElement>("#score");
const bestElement = requireElement<HTMLElement>("#best-score");
const speedElement = requireElement<HTMLElement>("#speed");
const overlay = requireElement<HTMLElement>("#game-overlay");
const overlayTitle = requireElement<HTMLElement>("#overlay-title");
const overlayCopy = requireElement<HTMLElement>("#overlay-copy");
const startButton = requireElement<HTMLButtonElement>("#start-button");
const jumpButton = requireElement<HTMLButtonElement>("#jump-button");
const duckButton = requireElement<HTMLButtonElement>("#duck-button");

let state: GameState = createGameState(readBestScore());
let previousTime = performance.now();
let previousPhase: GamePhase = state.phase;
let previousBest = state.bestScore;
let isNewBest = false;
let animationFrame = 0;

const render = createCanvasRenderer(canvas, context);

function updateInterface(): void {
  scoreElement.textContent = formatScore(state.score);
  bestElement.textContent = formatScore(state.bestScore);
  speedElement.textContent = String(Math.round(state.speed / 10));
  stage.dataset.phase = state.phase;
  overlay.classList.toggle("is-visible", state.phase !== "running");

  if (state.phase === "ready") {
    overlayTitle.textContent = "달릴 준비됐나요?";
    overlayCopy.textContent = "선인장은 뛰어넘고, 익룡 아래에서는 몸을 낮추세요.";
    startButton.innerHTML = "<span>게임 시작</span><b>SPACE</b>";
  } else if (state.phase === "paused") {
    overlayTitle.textContent = "잠시 쉬어갈까요?";
    overlayCopy.textContent = "준비되면 같은 자리에서 다시 출발합니다.";
    startButton.innerHTML = "<span>계속 달리기</span><b>SPACE</b>";
  } else if (state.phase === "gameOver") {
    overlayTitle.textContent = `${formatScore(state.score)}점`;
    overlayCopy.textContent = isNewBest
      ? "오늘의 석양에 새로운 기록을 남겼어요."
      : `최고 기록 ${formatScore(state.bestScore)}점에 다시 도전해보세요.`;
    startButton.innerHTML = "<span>다시 달리기</span><b>SPACE</b>";
  }
}

function beginOrResume(): void {
  if (state.phase === "paused") {
    resumeGame(state);
  } else {
    startGame(state);
    isNewBest = false;
  }
  previousTime = performance.now();
  updateInterface();
  canvas.focus({ preventScroll: true });
}

function requestJump(): void {
  if (state.phase === "running") jump(state);
  else beginOrResume();
}

function gameLoop(now: number): void {
  const deltaSeconds = (now - previousTime) / 1000;
  previousTime = now;
  previousPhase = state.phase;
  previousBest = state.bestScore;

  tickGame(state, deltaSeconds);
  if (previousPhase === "running" && state.phase === "gameOver") {
    isNewBest = state.bestScore > previousBest;
    saveBestScore(state.bestScore);
  }

  updateInterface();
  render(state);
  animationFrame = requestAnimationFrame(gameLoop);
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.target instanceof HTMLButtonElement && event.code === "Space") {
    return;
  }
  if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
    event.preventDefault();
    if (!event.repeat) requestJump();
    return;
  }
  if (["ArrowDown", "KeyS"].includes(event.code)) {
    event.preventDefault();
    setDucking(state, true);
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  if (["ArrowDown", "KeyS"].includes(event.code)) setDucking(state, false);
}

startButton.addEventListener("click", beginOrResume);
jumpButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  requestJump();
});
duckButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  setDucking(state, true);
  duckButton.setPointerCapture(event.pointerId);
});
for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"] as const) {
  duckButton.addEventListener(eventName, () => setDucking(state, false));
}

window.addEventListener("keydown", handleKeyDown, { passive: false });
window.addEventListener("keyup", handleKeyUp);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseGame(state);
  previousTime = performance.now();
  updateInterface();
});

const resizeObserver = new ResizeObserver(([entry]) => {
  if (!entry) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(entry.contentRect.width * ratio));
  const height = Math.max(1, Math.round(entry.contentRect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  render(state);
});
resizeObserver.observe(canvas);

updateInterface();
render(state);
animationFrame = requestAnimationFrame(gameLoop);
window.addEventListener("pagehide", () => cancelAnimationFrame(animationFrame), { once: true });
