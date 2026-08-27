import "./app.css";
import {
  applySpeedBoost,
  createGameState,
  formatScore,
  GAME_VIEW_HEIGHT,
  jump,
  pauseGame,
  resetGame,
  resumeGame,
  setDucking,
  setViewportWidth,
  startGame,
  takeCollectedItems,
  tickGame,
  type GameState,
  type ItemKind,
} from "./game/engine";
import { createCanvasRenderer } from "./game/canvasRenderer";
import {
  LEADERBOARD_KEY,
  LEADERBOARD_UPDATED_EVENT,
  getBestScoreForStudent,
  getStudentLeaderboard,
  normalizeName,
  normalizeStudentId,
  readLeaderboard,
  recordLeaderboardScore,
  type PlayerId,
} from "./leaderboard";

type Route = "/" | "/game" | "/leaderboard" | "/settings";

interface PlayerController {
  id: PlayerId;
  state: GameState;
  isNewBest: boolean;
  studentId: string;
  name: string;
  scoreRecorded: boolean;
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  score: HTMLElement;
  speed: HTMLElement;
  itemHud: HTMLElement;
  pickupToast: HTMLElement;
  toastTimer: number | undefined;
  overlay: HTMLElement;
  overlayTitle: HTMLElement;
  overlayCopy: HTMLElement;
  studentIdInput: HTMLInputElement;
  nameInput: HTMLInputElement;
  jumpButton: HTMLButtonElement;
  duckButton: HTMLButtonElement;
  render: (state: GameState) => void;
}

const app = document.querySelector<HTMLElement>("#app")!;
if (!app) throw new Error("App root is unavailable.");

let cleanupRoute: (() => void) | undefined;

function requireElement<T extends Element>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[character]!,
  );
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
        <h1>공룡<br>러너</h1>
      </div>
      <nav class="route-grid" aria-label="메인 메뉴">
        <a class="route-card route-card-primary" href="/game" data-route>
          <span class="route-number">01</span>
          <span><b>시작</b></span>
          <i aria-hidden="true">→</i>
        </a>
        <a class="route-card" href="/leaderboard" data-route>
          <span class="route-number">02</span>
          <span><b>리더보드</b></span>
          <i aria-hidden="true">→</i>
        </a>
        <a class="route-card" href="/settings" data-route>
          <span class="route-number">03</span>
          <span><b>설정</b></span>
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
  return `
    <section class="player-stage player-${player}" data-player="${player}" aria-label="${playerLabel} 게임 화면">
      <canvas class="game-canvas" tabindex="0" aria-label="${playerLabel} 공룡 러너 캔버스">
        브라우저가 Canvas를 지원해야 게임을 플레이할 수 있습니다.
      </canvas>
      <div class="player-badge" aria-hidden="true"><b>${playerLabel}</b><span>${isPlayerOne ? "W / S" : "↑ / ↓"}</span></div>
      <div class="hud" aria-live="polite">
        <div class="hud-item"><span>거리</span><strong data-score>00000</strong></div>
        <div class="speed-chip"><i></i><span data-speed>34</span> KM/H</div>
      </div>
      <div class="item-hud" data-item-hud aria-label="활성 아이템" aria-live="polite"></div>
      <div class="pickup-toast" data-pickup-toast aria-live="polite"></div>
      <div class="game-overlay" data-overlay>
        <h2 data-overlay-title>00000점</h2>
        <p data-overlay-copy></p>
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
  const bestScore = 0;

  return {
    id: player,
    state: createGameState(bestScore),
    isNewBest: false,
    studentId: "",
    name: "",
    scoreRecorded: false,
    canvas,
    stage,
    score: requireElement("[data-score]", stage),
    speed: requireElement("[data-speed]", stage),
    itemHud: requireElement("[data-item-hud]", stage),
    pickupToast: requireElement("[data-pickup-toast]", stage),
    toastTimer: undefined,
    overlay: requireElement("[data-overlay]", stage),
    overlayTitle: requireElement("[data-overlay-title]", stage),
    overlayCopy: requireElement("[data-overlay-copy]", stage),
    studentIdInput: requireElement(`[data-student-id="${player}"]`, app),
    nameInput: requireElement(`[data-name="${player}"]`, app),
    jumpButton: requireElement("[data-jump]", stage),
    duckButton: requireElement("[data-duck]", stage),
    render: createCanvasRenderer(canvas, context),
  };
}

function updatePlayerInterface(player: PlayerController): void {
  const { state } = player;
  player.score.textContent = formatScore(state.score);
  player.speed.textContent = String(Math.round(state.speed / 10));
  player.stage.dataset.phase = state.phase;
  player.overlay.classList.toggle("is-visible", state.phase === "gameOver");
  const activeItems = [
    ["shield", "보호막"],
    ["giant", "거대화"],
    ["speed", "속도"],
    ["wings", "날개"],
  ] as const;
  const itemMarkup = activeItems
    .filter(([key]) => state.effects[key] > 0)
    .map(([key, label]) => `<span data-effect="${key}"><b>${label}</b>${Math.ceil(state.effects[key])}</span>`)
    .join("");
  if (player.itemHud.innerHTML !== itemMarkup) player.itemHud.innerHTML = itemMarkup;
  player.itemHud.hidden = itemMarkup.length === 0;

  if (state.phase === "gameOver") {
    player.overlayTitle.textContent = `${state.score}점`;
    player.overlayCopy.textContent = player.isNewBest
      ? `${player.name}님의 신기록입니다`
      : `${player.studentId} ${player.name}의 최고기록 ${state.bestScore}점`;
  }
}

const ITEM_MESSAGES: Record<Exclude<ItemKind, "speed-rival">, string> = {
  shield: "보호막 · 8초 무적",
  giant: "거대화 · 장애물 파괴",
  "speed-self": "속도 강화 · 간격 증가",
  wings: "날개 · 점프로 비행",
};

function showPickupToast(player: PlayerController, message: string): void {
  if (player.toastTimer !== undefined) window.clearTimeout(player.toastTimer);
  player.pickupToast.textContent = message;
  player.pickupToast.classList.add("is-visible");
  player.toastTimer = window.setTimeout(() => {
    player.pickupToast.classList.remove("is-visible");
    player.toastTimer = undefined;
  }, 1800);
}

function requestJump(player: PlayerController): void {
  if (player.state.phase === "running") jump(player.state);
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
      <section class="shared-control is-visible" data-shared-control aria-live="polite">
        <h2 data-shared-title>플레이어 정보</h2>
        <form class="identity-form" data-identity-form novalidate>
          <div class="identity-fields" data-identity-fields>
            <fieldset>
              <legend>1P</legend>
              <label><span>학번</span><input data-student-id="1p" type="text" maxlength="16" inputmode="numeric" autocomplete="off" aria-describedby="identity-error"></label>
              <label><span>이름</span><input data-name="1p" type="text" maxlength="12" autocomplete="name" aria-describedby="identity-error"></label>
            </fieldset>
            <fieldset>
              <legend>2P</legend>
              <label><span>학번</span><input data-student-id="2p" type="text" maxlength="16" inputmode="numeric" autocomplete="off" aria-describedby="identity-error"></label>
              <label><span>이름</span><input data-name="2p" type="text" maxlength="12" autocomplete="name" aria-describedby="identity-error"></label>
            </fieldset>
          </div>
          <small id="identity-error" data-identity-error aria-live="polite"></small>
          <button data-shared-button type="submit"><span>시작</span><b>SPACE</b></button>
          <p data-shared-copy>1P W / S · 2P ↑ / ↓</p>
        </form>
      </section>
    </main>
  `;

  const players = [createPlayerController("1p"), createPlayerController("2p")];
  const sharedControl = requireElement<HTMLElement>("[data-shared-control]", app);
  const sharedTitle = requireElement<HTMLElement>("[data-shared-title]", sharedControl);
  const identityForm = requireElement<HTMLFormElement>("[data-identity-form]", sharedControl);
  const identityFields = requireElement<HTMLElement>("[data-identity-fields]", identityForm);
  const identityError = requireElement<HTMLElement>("[data-identity-error]", identityForm);
  const sharedButton = requireElement<HTMLButtonElement>("[data-shared-button]", sharedControl);
  const sharedButtonLabel = requireElement<HTMLElement>("span", sharedButton);
  const sharedCopy = requireElement<HTMLElement>("[data-shared-copy]", sharedControl);
  let previousTime = performance.now();
  let animationFrame = 0;

  const clearIdentityForm = (): void => {
    for (const player of players) {
      player.studentIdInput.value = "";
      player.nameInput.value = "";
      player.studentIdInput.removeAttribute("aria-invalid");
      player.nameInput.removeAttribute("aria-invalid");
    }
    identityError.textContent = "";
  };

  const readIdentityForm = (): boolean => {
    const identities = players.map((player) => ({
      player,
      studentId: normalizeStudentId(player.studentIdInput.value),
      name: normalizeName(player.nameInput.value),
    }));
    const invalid = identities.find(({ studentId, name }) => !studentId || !name);
    for (const identity of identities) {
      identity.player.studentIdInput.toggleAttribute("aria-invalid", !identity.studentId);
      identity.player.nameInput.toggleAttribute("aria-invalid", !identity.name);
    }
    if (invalid) {
      identityError.textContent = `${invalid.player.id === "1p" ? "1P" : "2P"}의 학번과 이름을 입력하세요.`;
      (!invalid.studentId ? invalid.player.studentIdInput : invalid.player.nameInput)
        .focus({ preventScroll: true });
      return false;
    }
    for (const { player, studentId, name } of identities) {
      player.studentId = studentId;
      player.name = name;
    }
    identityError.textContent = "";
    return true;
  };

  const updateSharedControl = (): void => {
    const hasPausedPlayer = players.some((player) => player.state.phase === "paused");
    const isReady = players.every((player) => player.state.phase === "ready");
    const canReplay = players.every(
      (player) => player.state.phase === "gameOver" && player.scoreRecorded,
    );
    sharedControl.classList.toggle("is-visible", hasPausedPlayer || isReady || canReplay);
    identityFields.hidden = hasPausedPlayer || canReplay;
    if (hasPausedPlayer) {
      sharedTitle.hidden = false;
      sharedTitle.textContent = "일시정지";
      sharedButtonLabel.textContent = "계속";
      identityError.hidden = true;
      sharedCopy.hidden = true;
    } else if (canReplay) {
      sharedTitle.hidden = true;
      sharedButtonLabel.textContent = "다시 시작하기";
      identityError.hidden = true;
      sharedCopy.hidden = true;
    } else {
      sharedTitle.hidden = false;
      sharedTitle.textContent = "플레이어 정보";
      sharedButtonLabel.textContent = "시작";
      identityError.hidden = false;
      sharedCopy.textContent = "1P W · S / 2P ↑ · ↓";
      sharedCopy.hidden = false;
    }
  };

  const startOrResumeRound = (): void => {
    const hasPausedPlayer = players.some((player) => player.state.phase === "paused");
    if (hasPausedPlayer) {
      players.forEach((player) => resumeGame(player.state));
    } else {
      const canStart = players.every((player) => player.state.phase === "ready");
      const canReplay = players.every(
        (player) => player.state.phase === "gameOver" && player.scoreRecorded,
      );
      if (canReplay) {
        for (const player of players) {
          resetGame(player.state);
          player.studentId = "";
          player.name = "";
          player.scoreRecorded = false;
          player.isNewBest = false;
          updatePlayerInterface(player);
          player.render(player.state);
        }
        clearIdentityForm();
        previousTime = performance.now();
        updateSharedControl();
        return;
      }
      if (!canStart) return;
      if (!readIdentityForm()) return;
      const leaderboard = readLeaderboard();
      for (const player of players) {
        player.state.bestScore = getBestScoreForStudent(leaderboard, player.studentId);
        player.scoreRecorded = false;
        player.isNewBest = false;
        startGame(player.state);
        updatePlayerInterface(player);
      }
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
    previousTime = performance.now();
    updateSharedControl();
  };

  const recordFinishedScore = (player: PlayerController): void => {
    if (player.state.phase !== "gameOver" || player.scoreRecorded) return;
    const previousBest = getBestScoreForStudent(readLeaderboard(), player.studentId);
    player.state.bestScore = Math.max(previousBest, player.state.score);
    player.isNewBest = player.state.score > previousBest;
    player.scoreRecorded = true;
    recordLeaderboardScore({
      studentId: player.studentId,
      name: player.name,
      player: player.id,
      score: player.state.score,
    });
    if (players.every(({ state, scoreRecorded }) => state.phase === "gameOver" && scoreRecorded)) {
      clearIdentityForm();
    }
  };

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
      setViewportWidth(
        player.state,
        GAME_VIEW_HEIGHT * (entry.contentRect.width / Math.max(1, entry.contentRect.height)),
      );
      player.render(player.state);
    });
    observer.observe(player.canvas);
    return observer;
  });

  const gameLoop = (now: number): void => {
    const deltaSeconds = (now - previousTime) / 1000;
    previousTime = now;
    for (const player of players) {
      tickGame(player.state, deltaSeconds);
      for (const item of takeCollectedItems(player.state)) {
        if (item === "speed-rival") {
          const rival = players.find(({ id }) => id !== player.id)!;
          applySpeedBoost(rival.state);
          showPickupToast(player, "상대 속도 강화");
          showPickupToast(rival, "상대가 속도를 올렸습니다");
        } else {
          showPickupToast(player, ITEM_MESSAGES[item]);
        }
      }
      recordFinishedScore(player);
      updatePlayerInterface(player);
      player.render(player.state);
    }
    updateSharedControl();
    animationFrame = requestAnimationFrame(gameLoop);
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement) return;
    if (event.target instanceof HTMLButtonElement && event.code === "Space") return;
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) startOrResumeRound();
      return;
    }
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
    updateSharedControl();
  };

  for (const player of players) {
    player.studentIdInput.addEventListener("input", () => {
      if (normalizeStudentId(player.studentIdInput.value)) {
        player.studentIdInput.removeAttribute("aria-invalid");
        identityError.textContent = "";
      }
    });
    player.nameInput.addEventListener("input", () => {
      if (normalizeName(player.nameInput.value)) {
        player.nameInput.removeAttribute("aria-invalid");
        identityError.textContent = "";
      }
    });
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

  identityForm.addEventListener("submit", (event) => {
    event.preventDefault();
    startOrResumeRound();
  });
  window.addEventListener("keydown", handleKeyDown, { passive: false });
  window.addEventListener("keyup", handleKeyUp);
  document.addEventListener("visibilitychange", handleVisibility);
  animationFrame = requestAnimationFrame(gameLoop);
  updateSharedControl();

  return () => {
    cancelAnimationFrame(animationFrame);
    resizeObservers.forEach((observer) => observer.disconnect());
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    document.removeEventListener("visibilitychange", handleVisibility);
    players.forEach((player) => {
      if (player.toastTimer !== undefined) window.clearTimeout(player.toastTimer);
    });
  };
}

function renderLeaderboard(): () => void {
  document.title = "리더보드 · 공룡 게임";
  app.innerHTML = `
    <main class="subpage-view leaderboard-view">
      ${homeLink()}
      <header class="subpage-header">
        <h1>리더보드</h1>
      </header>
      <section class="leaderboard-board" data-leaderboard-board aria-live="polite">
        <ol class="podium-list" data-podium-list aria-label="상위 3명"></ol>
        <ol class="leaderboard-list" data-leaderboard-list aria-label="4위 이하"></ol>
      </section>
    </main>
  `;

  const podium = requireElement<HTMLOListElement>("[data-podium-list]", app);
  const list = requireElement<HTMLOListElement>("[data-leaderboard-list]", app);
  const updateList = (): void => {
    const scores = getStudentLeaderboard(readLeaderboard()).slice(0, 10);
    const topScores = scores.slice(0, 3);
    const remainingScores = scores.slice(3);
    podium.hidden = topScores.length === 0;
    podium.innerHTML = topScores.map((entry, index) => `
      <li class="podium-card" data-rank="${index + 1}">
        <span class="podium-rank">${index + 1}등</span>
        <span class="podium-name"><b>${escapeHtml(entry.name)}</b><small>${entry.studentId ? escapeHtml(entry.studentId) : "이전 기록"}</small></span>
        <strong>${formatScore(entry.score)}</strong>
      </li>
    `).join("");
    list.hidden = scores.length > 0 && remainingScores.length === 0;
    list.innerHTML = remainingScores.length > 0 ? remainingScores.map((entry, index) => `
      <li class="score-row">
        <span class="rank">${String(index + 4).padStart(2, "0")}</span>
        <span class="score-name"><b>${escapeHtml(entry.name)}</b><small>${entry.studentId ? escapeHtml(entry.studentId) : "이전 기록"}</small></span>
        <strong>${formatScore(entry.score)}</strong>
      </li>
    `).join("") : scores.length === 0 ? `
      <li class="score-row is-placeholder"><span class="rank">--</span><span class="score-name"><b>기록 없음</b></span><strong>-----</strong></li>
    ` : "";
  };
  const handleStorage = (event: StorageEvent): void => {
    if (event.key === LEADERBOARD_KEY || event.key === null) updateList();
  };

  updateList();
  window.addEventListener("storage", handleStorage);
  window.addEventListener(LEADERBOARD_UPDATED_EVENT, updateList);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LEADERBOARD_UPDATED_EVENT, updateList);
  };
}

function renderSettings(): void {
  document.title = "설정 · 공룡 게임";
  app.innerHTML = `
    <main class="subpage-view">
      ${homeLink()}
      <header class="subpage-header">
        <p class="eyebrow">PREFERENCES</p>
        <h1>설정</h1>
      </header>
      <section class="settings-list" aria-label="게임 설정 목업">
        <label class="setting-row"><span><b>화면 흔들림</b><small>충돌 효과</small></span><input type="checkbox" checked></label>
        <label class="setting-row"><span><b>속도 표시</b><small>현재 속도</small></span><input type="checkbox" checked></label>
        <label class="setting-row"><span><b>고대비 모드</b><small>장애물 강조</small></span><input type="checkbox"></label>
      </section>
    </main>
  `;
}

function renderRoute(): void {
  cleanupRoute?.();
  cleanupRoute = undefined;
  const route = getRoute();
  if (route === "/game") cleanupRoute = mountGame();
  else if (route === "/leaderboard") cleanupRoute = renderLeaderboard();
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
