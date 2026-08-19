import "./style.css";
import {
  createGameState,
  formatScore,
  jump,
  pauseGame,
  resumeGame,
  setDucking,
  startGame,
  tickGame,
  type GameState,
} from "./game/engine";
import { browserSupportsHtmlInCanvas } from "./game/htmlCanvas";
import { createRenderer, type GameLayers } from "./game/renderer";

const HIGH_SCORE_KEY = "dino-run:high-score:v1";
const OBSTACLE_LAYER_COUNT = 4;

function readBestScore(): number {
  const value = Number.parseInt(
    localStorage.getItem(HIGH_SCORE_KEY) ?? "0",
    10,
  );
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function persistBestScore(score: number): void {
  localStorage.setItem(HIGH_SCORE_KEY, String(score));
}

function obstacleMarkup(index: number): string {
  return `<div class="canvas-layer obstacle" data-obstacle-index="${index}" aria-hidden="true">
    <div class="cactus-art"><i></i><i></i><i></i><i></i></div>
    <div class="bird-art"><i></i><i></i><i></i><i></i><i></i></div>
  </div>`;
}

function sceneMarkup(): string {
  return `
    <section class="game-shell" aria-labelledby="game-title">
      <header class="page-heading">
        <p class="eyebrow">EXPERIMENTAL WEB GAME</p>
        <h1 id="game-title">Sunset Dino Run</h1>
        <p>하나의 DOM 세계를 두 개의 카메라와 시간 잔상으로 재합성합니다.</p>
      </header>
      <div class="canvas-frame">
        <canvas id="game-canvas" layoutsubtree aria-label="Sunset Dino Run 게임 화면" tabindex="0">
          <div class="canvas-layer world-backdrop" role="img" aria-label="석양과 산맥이 펼쳐진 픽셀 사막">
            <div class="world-sun" aria-hidden="true">
              <i></i><i></i><i></i><i></i><i></i>
            </div>
            <div class="world-cloud cloud-a" aria-hidden="true"><i></i><i></i><i></i></div>
            <div class="world-cloud cloud-b" aria-hidden="true"><i></i><i></i><i></i></div>
            <div class="world-cloud cloud-c" aria-hidden="true"><i></i><i></i><i></i></div>
            <div class="world-cloud cloud-d" aria-hidden="true"><i></i><i></i><i></i></div>
            <div class="mountain-range mountain-back" aria-hidden="true"></div>
            <div class="mountain-range mountain-front" aria-hidden="true"></div>
            <div class="world-ground" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
          <div class="canvas-layer hud" aria-live="polite">
            <div class="score-block"><span>SCORE</span><strong id="score">00000</strong></div>
            <div class="score-block best"><span>BEST</span><strong id="best-score">00000</strong></div>
            <div class="tech-badge"><i></i><span>LIVE DOM → 2 CAMERAS</span><b>RESAMPLED</b></div>
          </div>
          <div class="canvas-layer runner" aria-label="달리는 픽셀 공룡" role="img">
            <span class="runner-tail"></span><span class="runner-body"></span>
            <span class="runner-head"></span><span class="runner-eye"></span>
            <span class="runner-mouth"></span><span class="runner-arm"></span>
            <span class="runner-leg runner-leg-a"></span><span class="runner-leg runner-leg-b"></span>
          </div>
          ${Array.from({ length: OBSTACLE_LAYER_COUNT }, (_, index) => obstacleMarkup(index)).join("")}
          <aside class="canvas-layer dom-scope" aria-label="HTML-in-Canvas 실시간 재합성 스코프">
            <div class="scope-head">
              <span><i></i> DOM RECOMPOSITE</span>
              <button id="echo-button" type="button" aria-pressed="true">ECHO ON</button>
            </div>
            <div class="scope-grid" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <div class="scope-foot">
              <output id="scope-output" aria-live="polite">SCAN CLEAR</output>
              <label for="danger-meter">PROXIMITY</label>
              <meter id="danger-meter" min="0" max="100" low="35" high="70" optimum="0" value="0">0%</meter>
            </div>
          </aside>
          <section class="canvas-layer game-overlay" aria-live="assertive">
            <p class="overlay-kicker" id="overlay-kicker">SUNSET PROTOCOL</p>
            <h2 id="overlay-title">달릴 준비됐나요?</h2>
            <p id="overlay-copy">Space 또는 ↑ 키로 석양을 가르며 점프하세요.</p>
            <button type="button" id="start-button">게임 시작</button>
            <p class="key-hint">JUMP <kbd>SPACE</kbd> · DUCK <kbd>↓</kbd></p>
          </section>
          <div class="canvas-layer touch-controls" aria-label="터치 조작">
            <button id="duck-button" type="button" aria-label="숙이기">↓<span>DUCK</span></button>
            <button id="jump-button" type="button" aria-label="점프">↑<span>JUMP</span></button>
          </div>
        </canvas>
      </div>
      <footer class="game-meta">
        <span><i class="status-dot"></i> DOM SCOPE LIVE</span>
        <span>SPACE / ↑ JUMP</span>
        <span>↓ DUCK</span>
      </footer>
    </section>`;
}

function unsupportedMarkup(): string {
  return `
    <section class="unsupported" aria-labelledby="unsupported-title">
      <div class="unsupported-icon" aria-hidden="true"><i></i><i></i><i></i></div>
      <p class="eyebrow">EXPERIMENTAL API REQUIRED</p>
      <h1 id="unsupported-title">HTML-in-Canvas를 깨워주세요</h1>
      <p class="unsupported-lead">이 게임은 폴백 없이 실험 API 자체로 렌더링됩니다.</p>
      <ol>
        <li><strong>Chrome Canary 149+</strong>를 실행합니다.</li>
        <li>주소창에서 <code>chrome://flags/#canvas-draw-element</code>를 엽니다.</li>
        <li>플래그를 <strong>Enabled</strong>로 바꾸고 Canary를 재시작합니다.</li>
      </ol>
      <a href="https://developer.chrome.com/blog/html-in-canvas-origin-trial" target="_blank" rel="noreferrer">Chrome 공식 안내 보기 →</a>
      <p class="support-check">감지 결과: <strong>drawElementImage / requestPaint 미지원</strong></p>
    </section>`;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

function initializeGame(): void {
  const app = requireElement<HTMLElement>("#app");
  if (!browserSupportsHtmlInCanvas()) {
    app.innerHTML = unsupportedMarkup();
    document.body.classList.add("is-unsupported");
    return;
  }

  app.innerHTML = sceneMarkup();
  const canvas = requireElement<HTMLCanvasElement>("#game-canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D canvas context is unavailable.");

  canvas.layoutSubtree = true;
  let state: GameState = createGameState(readBestScore());
  let previousTime = performance.now();
  let animationFrame = 0;
  let lastSavedBest = state.bestScore;

  let effectsEnabled = !window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const score = requireElement<HTMLElement>("#score");
  const bestScore = requireElement<HTMLElement>("#best-score");
  const overlay = requireElement<HTMLElement>(".game-overlay");
  const overlayKicker = requireElement<HTMLElement>("#overlay-kicker");
  const overlayTitle = requireElement<HTMLElement>("#overlay-title");
  const overlayCopy = requireElement<HTMLElement>("#overlay-copy");
  const startButton = requireElement<HTMLButtonElement>("#start-button");
  const runner = requireElement<HTMLElement>(".runner");
  const obstacleLayers = Array.from(
    document.querySelectorAll<HTMLElement>(".obstacle"),
  );
  const scopeOutput = requireElement<HTMLOutputElement>("#scope-output");
  const dangerMeter = requireElement<HTMLMeterElement>("#danger-meter");
  const echoButton = requireElement<HTMLButtonElement>("#echo-button");
  const layers: GameLayers = {
    backdrop: requireElement<HTMLElement>(".world-backdrop"),
    hud: requireElement<HTMLElement>(".hud"),
    runner,
    obstacles: obstacleLayers,
    overlay,
    controls: requireElement<HTMLElement>(".touch-controls"),
    scope: requireElement<HTMLElement>(".dom-scope"),
  };

  const render = createRenderer(
    canvas,
    context,
    layers,
    () => state,
    () => effectsEnabled,
  );
  canvas.onpaint = render;

  function updateDom(): void {
    score.textContent = formatScore(state.score);
    bestScore.textContent = formatScore(state.bestScore);
    layers.backdrop.style.setProperty(
      "--cloud-shift-a",
      `${-((state.distance * 0.035) % 320)}px`,
    );
    layers.backdrop.style.setProperty(
      "--cloud-shift-b",
      `${-((state.distance * 0.018) % 180)}px`,
    );
    layers.backdrop.style.setProperty(
      "--ground-shift",
      `${-(state.distance % 54)}px`,
    );
    runner.classList.toggle("is-ducking", state.runner.ducking);
    runner.classList.toggle("is-airborne", !state.runner.grounded);
    runner.classList.toggle("step-b", Math.floor(state.elapsed * 10) % 2 === 1);

    obstacleLayers.forEach((layer, index) => {
      const obstacle = state.obstacles[index];
      layer.classList.toggle("is-active", Boolean(obstacle));
      layer.classList.toggle("is-bird", obstacle?.kind === "bird");
      layer.classList.toggle(
        "wing-down",
        obstacle?.kind === "bird" && Math.floor(state.elapsed * 8) % 2 === 1,
      );
    });

    const nextObstacle = state.obstacles
      .filter((obstacle) => obstacle.x + obstacle.width >= state.runner.x)
      .sort((a, b) => a.x - b.x)[0];
    const gap = nextObstacle
      ? Math.max(0, nextObstacle.x - state.runner.x - state.runner.width)
      : Number.POSITIVE_INFINITY;
    const proximity = Number.isFinite(gap)
      ? Math.round(Math.max(0, Math.min(100, 100 - gap / 3.4)))
      : 0;
    dangerMeter.value = proximity;
    scopeOutput.value = nextObstacle
      ? `${nextObstacle.kind === "bird" ? "AIR" : "GROUND"} ${Math.round(gap)}M`
      : "SCAN CLEAR";
    layers.scope.classList.toggle("is-danger", proximity >= 70);
    layers.scope.classList.toggle("is-echo-off", !effectsEnabled);
    echoButton.textContent = effectsEnabled ? "ECHO ON" : "ECHO OFF";
    echoButton.setAttribute("aria-pressed", String(effectsEnabled));

    overlay.classList.toggle("is-visible", state.phase !== "running");
    if (state.phase === "ready") {
      overlayKicker.textContent = "SUNSET PROTOCOL";
      overlayTitle.textContent = "달릴 준비됐나요?";
      overlayCopy.textContent = "Space 또는 ↑ 키로 석양을 가르며 점프하세요.";
      startButton.textContent = "게임 시작";
    } else if (state.phase === "paused") {
      overlayKicker.textContent = "PAUSED";
      overlayTitle.textContent = "잠시 멈췄어요";
      overlayCopy.textContent = "탭으로 돌아오면 이어서 달릴 수 있습니다.";
      startButton.textContent = "계속 달리기";
    } else if (state.phase === "gameOver") {
      overlayKicker.textContent = "RUN COMPLETE";
      overlayTitle.textContent = `${formatScore(state.score)}점`;
      overlayCopy.textContent =
        state.score >= state.bestScore
          ? "새로운 최고 기록입니다!"
          : "석양은 내일도 기다립니다.";
      startButton.textContent = "다시 달리기";
    }
  }

  function beginOrResume(): void {
    if (state.phase === "paused") resumeGame(state);
    else startGame(state);
    previousTime = performance.now();
    updateDom();
    canvas.requestPaint();
    canvas.focus({ preventScroll: true });
  }

  function gameLoop(now: number): void {
    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;
    const phaseBeforeTick = state.phase;
    tickGame(state, deltaSeconds);

    if (
      phaseBeforeTick !== "gameOver" &&
      state.phase === "gameOver" &&
      state.bestScore !== lastSavedBest
    ) {
      persistBestScore(state.bestScore);
      lastSavedBest = state.bestScore;
    }

    updateDom();
    canvas.requestPaint();
    animationFrame = requestAnimationFrame(gameLoop);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
      event.preventDefault();
      if (
        state.phase === "ready" ||
        state.phase === "gameOver" ||
        state.phase === "paused"
      )
        beginOrResume();
      else jump(state);
    }
    if (["ArrowDown", "KeyS"].includes(event.code)) {
      event.preventDefault();
      setDucking(state, true);
    }
  }

  function handleKeyUp(event: KeyboardEvent): void {
    if (["ArrowDown", "KeyS"].includes(event.code)) setDucking(state, false);
  }

  const jumpButton = requireElement<HTMLButtonElement>("#jump-button");
  const duckButton = requireElement<HTMLButtonElement>("#duck-button");
  startButton.addEventListener("click", beginOrResume);
  jumpButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (state.phase === "running") jump(state);
    else beginOrResume();
  });
  echoButton.addEventListener("click", () => {
    effectsEnabled = !effectsEnabled;
    updateDom();
    canvas.requestPaint();
  });
  duckButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    setDucking(state, true);
  });
  for (const eventName of [
    "pointerup",
    "pointercancel",
    "pointerleave",
  ] as const) {
    duckButton.addEventListener(eventName, () => setDucking(state, false));
  }

  window.addEventListener("keydown", handleKeyDown, { passive: false });
  window.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseGame(state);
    else if (state.phase === "paused") previousTime = performance.now();
    updateDom();
    canvas.requestPaint();
  });

  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const deviceSize = entry.devicePixelContentBoxSize?.[0];
    canvas.width =
      deviceSize?.inlineSize ??
      Math.round(entry.contentRect.width * window.devicePixelRatio);
    canvas.height =
      deviceSize?.blockSize ??
      Math.round(entry.contentRect.height * window.devicePixelRatio);
    canvas.requestPaint();
  });
  const supportsDevicePixelBox =
    "devicePixelContentBoxSize" in ResizeObserverEntry.prototype;
  observer.observe(
    canvas,
    supportsDevicePixelBox ? { box: "device-pixel-content-box" } : undefined,
  );

  updateDom();
  canvas.requestPaint();
  animationFrame = requestAnimationFrame(gameLoop);
  window.addEventListener(
    "pagehide",
    () => cancelAnimationFrame(animationFrame),
    { once: true },
  );
}

initializeGame();
