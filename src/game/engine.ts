export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;
export const GROUND_Y = 420;

export type GamePhase = "ready" | "running" | "paused" | "gameOver";
export type ObstacleKind =
  | "cactus-small"
  | "cactus-large"
  | "cactus-double"
  | "cactus-triple"
  | "bird-high"
  | "bird-low";
export type ItemKind =
  | "shield"
  | "giant"
  | "speed-self"
  | "speed-rival"
  | "super-jump"
  | "wings";

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

export interface ItemState {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DestructionEffectState {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  age: number;
}

export interface TimedEffects {
  shield: number;
  giant: number;
  speed: number;
  superJump: number;
  wings: number;
}

export interface GameState {
  phase: GamePhase;
  previousPhase: Exclude<GamePhase, "paused">;
  runner: RunnerState;
  obstacles: ObstacleState[];
  items: ItemState[];
  destructionEffects: DestructionEffectState[];
  effects: TimedEffects;
  collectedItems: ItemKind[];
  score: number;
  bestScore: number;
  distance: number;
  speed: number;
  spawnTimer: number;
  itemSpawnTimer: number;
  nextObstacleId: number;
  nextItemId: number;
  elapsed: number;
  viewportWidth: number;
}

const RUNNER_X = 128;
const RUNNER_WIDTH = 68;
const RUNNER_HEIGHT = 82;
const DUCK_HEIGHT = 48;
const GRAVITY = 2250;
const JUMP_VELOCITY = -810;
const SUPER_JUMP_VELOCITY = -1030;
const WING_FLAP_VELOCITY = -470;
const STARTING_SPEED = 340;
const MAX_SPEED = 720;
const SPEED_BOOST_MULTIPLIER = 1.28;
const MIN_SPAWN_DELAY = 0.72;
const ITEM_SIZE = 42;
const ITEM_OBSTACLE_GAP = 96;
const BLOCKED_SPAWN_RETRY = 0.65;
const WEIGHTED_ITEM_KINDS: ItemKind[] = [
  "shield",
  "giant",
  "giant",
  "speed-self",
  "speed-self",
  "speed-rival",
  "speed-rival",
  "super-jump",
  "super-jump",
  "wings",
  "wings",
];
const OBSTACLE_SPECS = {
  "cactus-small": { width: 34, height: 50, y: GROUND_Y - 50 },
  "cactus-large": { width: 48, height: 82, y: GROUND_Y - 82 },
  "cactus-double": { width: 72, height: 62, y: GROUND_Y - 62 },
  "cactus-triple": { width: 104, height: 64, y: GROUND_Y - 64 },
  "bird-high": { width: 78, height: 42, y: GROUND_Y - 132 },
  "bird-low": { width: 78, height: 42, y: GROUND_Y - 80 },
} satisfies Record<ObstacleKind, { width: number; height: number; y: number }>;

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
    items: [],
    destructionEffects: [],
    effects: { shield: 0, giant: 0, speed: 0, superJump: 0, wings: 0 },
    collectedItems: [],
    score: 0,
    bestScore,
    distance: 0,
    speed: STARTING_SPEED,
    spawnTimer: 1.15,
    itemSpawnTimer: 8,
    nextObstacleId: 1,
    nextItemId: 1,
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

export function resetGame(state: GameState): void {
  const viewportWidth = state.viewportWidth;
  Object.assign(state, createGameState());
  state.viewportWidth = viewportWidth;
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
  if (state.phase !== "running") return false;
  if (state.effects.wings > 0) {
    state.runner.ducking = false;
    state.runner.height = RUNNER_HEIGHT;
    state.runner.grounded = false;
    state.runner.velocityY = WING_FLAP_VELOCITY;
    return true;
  }
  if (!state.runner.grounded) return false;
  state.runner.ducking = false;
  state.runner.height = RUNNER_HEIGHT;
  state.runner.y = GROUND_Y - RUNNER_HEIGHT;
  state.runner.velocityY = state.effects.superJump > 0
    ? SUPER_JUMP_VELOCITY
    : JUMP_VELOCITY;
  state.runner.grounded = false;
  return true;
}

export function setDucking(state: GameState, ducking: boolean): void {
  if (state.phase !== "running" || !state.runner.grounded || state.effects.wings > 0) return;
  state.runner.ducking = ducking;
  state.runner.height = ducking ? DUCK_HEIGHT : RUNNER_HEIGHT;
  state.runner.y = GROUND_Y - state.runner.height;
}

export function applySpeedBoost(state: GameState, duration = 7): void {
  if (state.phase !== "running") return;
  const wasInactive = state.effects.speed <= 0;
  state.effects.speed = Math.max(state.effects.speed, duration);
  if (wasInactive) state.spawnTimer += 0.25;
}

export function takeCollectedItems(state: GameState): ItemKind[] {
  return state.collectedItems.splice(0);
}

function getNextSpawnDelay(speed: number, random: () => number): number {
  const cadenceRoll = random();
  const varianceRoll = random();
  const baseDelay = cadenceRoll < 0.2
    ? 0.72 + varianceRoll * 0.25
    : cadenceRoll < 0.8
      ? 1 + varianceRoll * 0.6
      : 1.72 + varianceRoll * 0.55;
  const speedFactor = Math.min(0.28, (speed - STARTING_SPEED) / 1500);
  return Math.max(MIN_SPAWN_DELAY, baseDelay - speedFactor);
}

function getNextItemSpawnDelay(random: () => number): number {
  return 4 + random() * 3;
}

function isHorizontallyNear(
  x: number,
  width: number,
  other: { x: number; width: number },
): boolean {
  return (
    x < other.x + other.width + ITEM_OBSTACLE_GAP &&
    x + width + ITEM_OBSTACLE_GAP > other.x
  );
}

function spawnObstacle(state: GameState, random: () => number): void {
  const spawnX = state.viewportWidth + 48;
  if (state.items.some((item) => isHorizontallyNear(spawnX, 104, item))) {
    state.spawnTimer = BLOCKED_SPAWN_RETRY;
    return;
  }
  const cactusKinds: ObstacleKind[] = ["cactus-small", "cactus-large"];
  if (state.score >= 35) cactusKinds.push("cactus-double");
  if (state.score >= 70) cactusKinds.push("cactus-triple");

  const spawnBird = state.score > 75 && random() > 0.62;
  const kind: ObstacleKind = spawnBird
    ? random() < 0.5
      ? "bird-high"
      : "bird-low"
    : cactusKinds[Math.min(cactusKinds.length - 1, Math.floor(random() * cactusKinds.length))]!;
  const { width, height, y } = OBSTACLE_SPECS[kind];
  state.obstacles.push({
    id: state.nextObstacleId++,
    kind,
    x: spawnX,
    y,
    width,
    height,
  });

  const fairSpeedGap = state.effects.speed > 0 ? 1.16 : 1;
  const minimumDelay = state.effects.speed > 0 ? 0.8 : MIN_SPAWN_DELAY;
  state.spawnTimer = Math.max(
    minimumDelay,
    getNextSpawnDelay(state.speed, random) * fairSpeedGap,
  );
}

function spawnItem(state: GameState, random: () => number): void {
  const spawnX = state.viewportWidth + 64;
  if (state.obstacles.some((obstacle) => isHorizontallyNear(spawnX, ITEM_SIZE, obstacle))) {
    state.itemSpawnTimer = BLOCKED_SPAWN_RETRY;
    return;
  }
  const kind = WEIGHTED_ITEM_KINDS[Math.min(
    WEIGHTED_ITEM_KINDS.length - 1,
    Math.floor(random() * WEIGHTED_ITEM_KINDS.length),
  )]!;
  const heightRoll = random();
  state.items.push({
    id: state.nextItemId++,
    kind,
    x: spawnX,
    y: GROUND_Y - (heightRoll < 0.58 ? 88 : 142),
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  });
  state.itemSpawnTimer = getNextItemSpawnDelay(random);
}

function overlaps(a: RunnerState, b: ObstacleState): boolean {
  const runnerInsetX = a.ducking ? 10 : 13;
  const runnerInsetTop = a.ducking ? 7 : 10;
  const obstacleInset = b.kind.startsWith("bird-") ? 9 : 5;
  return (
    a.x + runnerInsetX < b.x + b.width - obstacleInset &&
    a.x + a.width - runnerInsetX > b.x + obstacleInset &&
    a.y + runnerInsetTop < b.y + b.height - 4 &&
    a.y + a.height - 3 > b.y + 4
  );
}

function overlapsObstacle(state: GameState, obstacle: ObstacleState): boolean {
  if (state.effects.giant <= 0) return overlaps(state.runner, obstacle);
  const giantWidth = state.runner.width * 1.38;
  const giantHeight = state.runner.height * 1.38;
  return overlaps({
    ...state.runner,
    x: state.runner.x - (giantWidth - state.runner.width) / 2,
    y: GROUND_Y - giantHeight,
    width: giantWidth,
    height: giantHeight,
  }, obstacle);
}

function overlapsItem(runner: RunnerState, item: ItemState): boolean {
  return (
    runner.x + 8 < item.x + item.width - 4 &&
    runner.x + runner.width - 8 > item.x + 4 &&
    runner.y + 5 < item.y + item.height - 4 &&
    runner.y + runner.height - 2 > item.y + 4
  );
}

function collectItem(state: GameState, kind: ItemKind): void {
  state.collectedItems.push(kind);
  if (kind === "shield") state.effects.shield = 8;
  else if (kind === "giant") state.effects.giant = 10;
  else if (kind === "speed-self") applySpeedBoost(state);
  else if (kind === "super-jump") state.effects.superJump = 10;
  else if (kind === "wings") {
    state.effects.wings = 10;
    state.runner.ducking = false;
    state.runner.height = RUNNER_HEIGHT;
    state.runner.grounded = false;
    state.runner.velocityY = -350;
  }
}

function updateEffects(state: GameState, dt: number): void {
  for (const key of Object.keys(state.effects) as Array<keyof TimedEffects>) {
    state.effects[key] = Math.max(0, state.effects[key] - dt);
  }
}

export function tickGame(
  state: GameState,
  deltaSeconds: number,
  random: () => number = Math.random,
): void {
  if (state.phase !== "running") return;
  const dt = Math.min(Math.max(deltaSeconds, 0), 0.04);
  state.elapsed += dt;
  updateEffects(state, dt);

  if (!state.runner.grounded) {
    const gravity = state.effects.wings > 0
      ? 760
      : state.effects.superJump > 0
        ? 1800
        : GRAVITY;
    state.runner.velocityY += gravity * dt;
    state.runner.y += state.runner.velocityY * dt;
    state.runner.y = Math.max(46, state.runner.y);
    const floorY = GROUND_Y - RUNNER_HEIGHT;
    if (state.runner.y >= floorY) {
      state.runner.y = floorY;
      state.runner.velocityY = 0;
      state.runner.grounded = true;
    }
  }

  const baseSpeed = Math.min(MAX_SPEED, STARTING_SPEED + state.score * 0.72);
  state.speed = baseSpeed * (state.effects.speed > 0 ? SPEED_BOOST_MULTIPLIER : 1);
  state.distance += state.speed * dt;
  state.score = Math.floor(state.distance / 12);
  state.spawnTimer -= dt;
  state.itemSpawnTimer -= dt;

  if (state.spawnTimer <= 0) spawnObstacle(state, random);
  if (state.itemSpawnTimer <= 0) spawnItem(state, random);

  for (const obstacle of state.obstacles) {
    obstacle.x -= state.speed * dt;
  }
  for (const item of state.items) item.x -= state.speed * dt;
  for (const effect of state.destructionEffects) {
    effect.x -= state.speed * dt;
    effect.age += dt;
  }
  state.destructionEffects = state.destructionEffects.filter(
    (effect) => effect.age < 0.55,
  );
  state.obstacles = state.obstacles.filter(
    (obstacle) => obstacle.x + obstacle.width > -30,
  );
  const collected = state.items.filter((item) => overlapsItem(state.runner, item));
  for (const item of collected) collectItem(state, item.kind);
  const collectedIds = new Set(collected.map((item) => item.id));
  state.items = state.items.filter(
    (item) => item.x + item.width > -30 && !collectedIds.has(item.id),
  );

  const collisions = state.obstacles.filter((obstacle) => overlapsObstacle(state, obstacle));
  if (collisions.length > 0 && (state.effects.shield > 0 || state.effects.giant > 0)) {
    if (state.effects.giant > 0) {
      for (const obstacle of collisions) {
        state.destructionEffects.push({
          id: obstacle.id,
          kind: obstacle.kind,
          x: obstacle.x + obstacle.width / 2,
          y: obstacle.y + obstacle.height / 2,
          age: 0,
        });
      }
    }
    const destroyedIds = new Set(collisions.map((obstacle) => obstacle.id));
    state.obstacles = state.obstacles.filter((obstacle) => !destroyedIds.has(obstacle.id));
  } else if (collisions.length > 0) {
    state.phase = "gameOver";
    state.previousPhase = "gameOver";
    state.bestScore = Math.max(state.bestScore, state.score);
  }
}

export function formatScore(score: number): string {
  return Math.max(0, score).toString().padStart(5, "0");
}
