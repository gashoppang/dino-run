export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;
export const GROUND_Y = 420;

export type GamePhase = "ready" | "running" | "paused" | "gameOver";
export type ObstacleKind = "cactus" | "bird";

export interface RunnerState {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  ducking: boolean;
  grounded: boolean;
}

export interface ObstacleState {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  phase: GamePhase;
  previousPhase: Exclude<GamePhase, "paused">;
  runner: RunnerState;
  obstacles: ObstacleState[];
  score: number;
  bestScore: number;
  distance: number;
  speed: number;
  spawnTimer: number;
  nextObstacleId: number;
  elapsed: number;
  viewportWidth: number;
}

const RUNNER_X = 128;
const RUNNER_WIDTH = 68;
const RUNNER_HEIGHT = 82;
const DUCK_HEIGHT = 48;
const GRAVITY = 2250;
const JUMP_VELOCITY = -810;
const STARTING_SPEED = 340;
const MAX_SPEED = 720;

function createRunner(): RunnerState {
  return {
    x: RUNNER_X,
    y: GROUND_Y - RUNNER_HEIGHT,
    width: RUNNER_WIDTH,
    height: RUNNER_HEIGHT,
    velocityY: 0,
    ducking: false,
    grounded: true,
  };
}

export function createGameState(bestScore = 0): GameState {
  return {
    phase: "ready",
    previousPhase: "ready",
    runner: createRunner(),
    obstacles: [],
    score: 0,
    bestScore,
    distance: 0,
    speed: STARTING_SPEED,
    spawnTimer: 1.15,
    nextObstacleId: 1,
    elapsed: 0,
    viewportWidth: WORLD_WIDTH,
  };
}

export function startGame(state: GameState): void {
  const bestScore = state.bestScore;
  const viewportWidth = state.viewportWidth;
  Object.assign(state, createGameState(bestScore));
  state.viewportWidth = viewportWidth;
  state.phase = "running";
  state.previousPhase = "running";
}

export function setViewportWidth(state: GameState, width: number): void {
  state.viewportWidth = Math.max(480, Math.min(2400, width));
}

export function pauseGame(state: GameState): void {
  if (state.phase === "running" || state.phase === "ready") {
    state.previousPhase = state.phase;
    state.phase = "paused";
  }
}

export function resumeGame(state: GameState): void {
  if (state.phase === "paused") {
    state.phase = state.previousPhase;
  }
}

export function jump(state: GameState): boolean {
  if (state.phase !== "running" || !state.runner.grounded) return false;
  state.runner.ducking = false;
  state.runner.height = RUNNER_HEIGHT;
  state.runner.y = GROUND_Y - RUNNER_HEIGHT;
  state.runner.velocityY = JUMP_VELOCITY;
  state.runner.grounded = false;
  return true;
}

export function setDucking(state: GameState, ducking: boolean): void {
  if (state.phase !== "running" || !state.runner.grounded) return;
  state.runner.ducking = ducking;
  state.runner.height = ducking ? DUCK_HEIGHT : RUNNER_HEIGHT;
  state.runner.y = GROUND_Y - state.runner.height;
}

function spawnObstacle(state: GameState, random: () => number): void {
  const kind: ObstacleKind =
    random() > 0.62 && state.score > 75 ? "bird" : "cactus";
  const isBird = kind === "bird";
  const width = isBird ? 78 : 44 + Math.round(random() * 18);
  const height = isBird ? 42 : 62 + Math.round(random() * 20);
  state.obstacles.push({
    id: state.nextObstacleId++,
    kind,
    x: state.viewportWidth + 48,
    y: isBird ? GROUND_Y - 80 : GROUND_Y - height,
    width,
    height,
  });

  const speedFactor = Math.min(0.28, (state.speed - STARTING_SPEED) / 1500);
  state.spawnTimer = 1.02 + random() * 0.62 - speedFactor;
}

function overlaps(a: RunnerState, b: ObstacleState): boolean {
  const runnerInsetX = a.ducking ? 10 : 13;
  const runnerInsetTop = a.ducking ? 7 : 10;
  const obstacleInset = b.kind === "bird" ? 9 : 5;
  return (
    a.x + runnerInsetX < b.x + b.width - obstacleInset &&
    a.x + a.width - runnerInsetX > b.x + obstacleInset &&
    a.y + runnerInsetTop < b.y + b.height - 4 &&
    a.y + a.height - 3 > b.y + 4
  );
}

export function tickGame(
  state: GameState,
  deltaSeconds: number,
  random: () => number = Math.random,
): void {
  if (state.phase !== "running") return;
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.04);
  state.elapsed += dt;

  if (!state.runner.grounded) {
    state.runner.velocityY += GRAVITY * dt;
    state.runner.y += state.runner.velocityY * dt;
    const floorY = GROUND_Y - RUNNER_HEIGHT;
    if (state.runner.y >= floorY) {
      state.runner.y = floorY;
      state.runner.velocityY = 0;
      state.runner.grounded = true;
    }
  }

  state.distance += state.speed * dt;
  state.score = Math.floor(state.distance / 12);
  state.speed = Math.min(MAX_SPEED, STARTING_SPEED + state.score * 0.72);
  state.spawnTimer -= dt;

  if (state.spawnTimer <= 0) spawnObstacle(state, random);

  for (const obstacle of state.obstacles) {
    obstacle.x -= state.speed * dt;
  }
  state.obstacles = state.obstacles.filter(
    (obstacle) => obstacle.x + obstacle.width > -30,
  );

  if (state.obstacles.some((obstacle) => overlaps(state.runner, obstacle))) {
    state.phase = "gameOver";
    state.previousPhase = "gameOver";
    state.bestScore = Math.max(state.bestScore, state.score);
  }
}

export function formatScore(score: number): string {
  return Math.max(0, score).toString().padStart(5, "0");
}
