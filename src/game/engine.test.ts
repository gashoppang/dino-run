import { describe, expect, it } from "vitest";
import {
  GROUND_Y,
  applySpeedBoost,
  createGameState,
  jump,
  pauseGame,
  resetGame,
  resumeGame,
  setDucking,
  setViewportWidth,
  startGame,
  takeCollectedItems,
  tickGame,
} from "./engine";

describe("game engine", () => {
  it("starts with a preserved best score", () => {
    const state = createGameState(321);
    startGame(state);
    expect(state.phase).toBe("running");
    expect(state.bestScore).toBe(321);
    expect(state.score).toBe(0);
  });

  it("resets a finished round to the ready state", () => {
    const state = createGameState(50);
    setViewportWidth(state, 1800);
    startGame(state);
    state.score = 40;
    state.distance = 480;
    state.obstacles.push({
      id: 1,
      kind: "cactus-small",
      x: 500,
      y: GROUND_Y - 50,
      width: 34,
      height: 50,
    });

    resetGame(state);

    expect(state.phase).toBe("ready");
    expect(state.score).toBe(0);
    expect(state.bestScore).toBe(0);
    expect(state.obstacles).toEqual([]);
    expect(state.viewportWidth).toBe(1800);
  });

  it("jumps and lands back on the ground", () => {
    const state = createGameState();
    startGame(state);
    expect(jump(state)).toBe(true);
    expect(state.runner.grounded).toBe(false);
    for (let frame = 0; frame < 120; frame += 1)
      tickGame(state, 1 / 60, () => 0.5);
    expect(state.runner.grounded).toBe(true);
    expect(state.runner.y + state.runner.height).toBe(GROUND_Y);
  });

  it("changes the runner hitbox while ducking", () => {
    const state = createGameState();
    startGame(state);
    const standingHeight = state.runner.height;
    setDucking(state, true);
    expect(state.runner.ducking).toBe(true);
    expect(state.runner.height).toBeLessThan(standingHeight);
    expect(state.runner.y + state.runner.height).toBe(GROUND_Y);
    setDucking(state, false);
    expect(state.runner.height).toBe(standingHeight);
  });

  it("lets a ducking runner pass under a bird", () => {
    const createBird = () => ({
      id: 1,
      kind: "bird-low" as const,
      x: 143,
      y: GROUND_Y - 80,
      width: 78,
      height: 42,
    });
    const standingState = createGameState();
    startGame(standingState);
    standingState.obstacles.push(createBird());
    tickGame(standingState, 1 / 60, () => 0.5);
    expect(standingState.phase).toBe("gameOver");

    const duckingState = createGameState();
    startGame(duckingState);
    setDucking(duckingState, true);
    duckingState.obstacles.push(createBird());
    tickGame(duckingState, 1 / 60, () => 0.5);
    expect(duckingState.phase).toBe("running");
  });

  it("lets a standing runner pass under a high bird", () => {
    const state = createGameState();
    startGame(state);
    state.obstacles.push({
      id: 1,
      kind: "bird-high",
      x: 143,
      y: GROUND_Y - 132,
      width: 78,
      height: 42,
    });
    tickGame(state, 1 / 60, () => 0.5);
    expect(state.phase).toBe("running");
  });

  it.each([
    ["cactus-small", 0.01, 34, 50],
    ["cactus-large", 0.26, 48, 82],
    ["cactus-double", 0.51, 72, 62],
    ["cactus-triple", 0.76, 104, 64],
  ] as const)("spawns the %s obstacle", (expectedKind, cactusRoll, width, height) => {
    const state = createGameState();
    startGame(state);
    state.distance = 1200;
    state.spawnTimer = 0;
    const rolls = [0.5, cactusRoll, 0.5];
    tickGame(state, 1 / 60, () => rolls.shift() ?? 0.5);
    expect(state.obstacles[0]?.kind).toBe(expectedKind);
    expect(state.obstacles[0]?.width).toBe(width);
    expect(state.obstacles[0]?.height).toBe(height);
  });

  it.each([
    ["bird-high", 0.1, GROUND_Y - 132],
    ["bird-low", 0.9, GROUND_Y - 80],
  ] as const)("spawns the %s obstacle at its own altitude", (expectedKind, heightRoll, expectedY) => {
    const state = createGameState();
    startGame(state);
    state.distance = 1200;
    state.spawnTimer = 0;
    const rolls = [0.9, heightRoll, 0.5];
    tickGame(state, 1 / 60, () => rolls.shift() ?? 0.5);
    expect(state.obstacles[0]?.kind).toBe(expectedKind);
    expect(state.obstacles[0]?.y).toBe(expectedY);
  });

  it("mixes tight, normal, and breather obstacle gaps", () => {
    const spawnWithCadence = (cadenceRoll: number): number => {
      const state = createGameState();
      startGame(state);
      state.spawnTimer = 0;
      const rolls = [0, cadenceRoll, 0.5];
      tickGame(state, 1 / 60, () => rolls.shift() ?? 0.5);
      return state.spawnTimer;
    };

    const tightGap = spawnWithCadence(0.1);
    const normalGap = spawnWithCadence(0.5);
    const breatherGap = spawnWithCadence(0.9);

    expect(tightGap).toBeCloseTo(0.9);
    expect(normalGap).toBeCloseTo(1.3);
    expect(breatherGap).toBeCloseTo(1.995);
  });

  it("keeps the minimum obstacle gap at 0.9 seconds at top speed", () => {
    const state = createGameState();
    startGame(state);
    state.distance = 10000;
    state.spawnTimer = 0;
    const rolls = [0.5, 0, 0, 0];
    tickGame(state, 1 / 60, () => rolls.shift() ?? 0);
    expect(state.spawnTimer).toBe(0.9);
  });

  it("uses the configured item spawn cadence", () => {
    const state = createGameState();
    expect(state.itemSpawnTimer).toBe(8);
    startGame(state);
    state.spawnTimer = 100;
    state.itemSpawnTimer = 0;

    tickGame(state, 1 / 60, () => 0.5);

    expect(state.items).toHaveLength(1);
    expect(state.itemSpawnTimer).toBe(5.5);
  });

  it("makes shields rarer than every other item", () => {
    const counts = new Map<string, number>();
    for (let slot = 0; slot < 13; slot += 1) {
      const state = createGameState();
      startGame(state);
      state.spawnTimer = 100;
      state.itemSpawnTimer = 0;
      const rolls = [(slot + 0.5) / 13, 0.5, 0.5];
      tickGame(state, 1 / 60, () => rolls.shift() ?? 0.5);
      const kind = state.items[0]!.kind;
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }

    expect(counts.get("shield")).toBe(1);
    expect(counts.get("giant")).toBe(3);
    expect(counts.get("speed-self")).toBe(3);
    expect(counts.get("speed-rival")).toBe(3);
    expect(counts.get("wings")).toBe(3);
  });

  it("defers an item until it has a safe gap from an obstacle", () => {
    const state = createGameState();
    startGame(state);
    state.spawnTimer = 0;
    state.itemSpawnTimer = 0;

    tickGame(state, 1 / 60, () => 0.5);

    expect(state.obstacles).toHaveLength(1);
    expect(state.items).toHaveLength(0);
    expect(state.itemSpawnTimer).toBeCloseTo(0.65);

    for (let frame = 0; frame < 50 && state.items.length === 0; frame += 1) {
      tickGame(state, 1 / 60, () => 0.5);
    }

    const obstacle = state.obstacles[0]!;
    const item = state.items[0]!;
    expect(item).toBeDefined();
    expect(item.x - (obstacle.x + obstacle.width)).toBeGreaterThanOrEqual(96);
  });

  it("defers an obstacle when an item already occupies its spawn lane", () => {
    const state = createGameState();
    startGame(state);
    state.itemSpawnTimer = 100;
    state.spawnTimer = 0;
    state.items.push({
      id: 1,
      kind: "wings",
      x: state.viewportWidth + 64,
      y: GROUND_Y - 88,
      width: 42,
      height: 42,
    });

    tickGame(state, 1 / 60, () => 0.5);

    expect(state.obstacles).toHaveLength(0);
    expect(state.spawnTimer).toBeCloseTo(0.65);
  });

  it("ends the game and updates the best score on collision", () => {
    const state = createGameState(2);
    startGame(state);
    state.score = 8;
    state.distance = 96;
    state.obstacles.push({
      id: 1,
      kind: "cactus-large",
      x: state.runner.x + 10,
      y: state.runner.y + 10,
      width: 48,
      height: 70,
    });
    tickGame(state, 1 / 60, () => 0.5);
    expect(state.phase).toBe("gameOver");
    expect(state.bestScore).toBeGreaterThanOrEqual(8);
  });

  it("collects a shield and survives a collision for 8 seconds", () => {
    const state = createGameState();
    startGame(state);
    state.itemSpawnTimer = 100;
    state.items.push({
      id: 1,
      kind: "shield",
      x: state.runner.x + 12,
      y: state.runner.y + 12,
      width: 42,
      height: 42,
    });
    state.obstacles.push({
      id: 1,
      kind: "cactus-large",
      x: state.runner.x + 12,
      y: state.runner.y + 8,
      width: 48,
      height: 82,
    });

    tickGame(state, 1 / 60, () => 0.5);

    expect(state.phase).toBe("running");
    expect(state.effects.shield).toBe(8);
    expect(state.items).toHaveLength(0);
    expect(state.obstacles).toHaveLength(0);
    expect(takeCollectedItems(state)).toEqual(["shield"]);
  });

  it("destroys collided obstacles while giant", () => {
    const state = createGameState();
    startGame(state);
    state.effects.giant = 10;
    state.obstacles.push({
      id: 1,
      kind: "cactus-small",
      x: state.runner.x + state.runner.width - 6,
      y: GROUND_Y - 50,
      width: 34,
      height: 50,
    });

    tickGame(state, 1 / 60, () => 0.5);

    expect(state.phase).toBe("running");
    expect(state.obstacles).toHaveLength(0);
    expect(state.destructionEffects).toEqual([
      expect.objectContaining({ kind: "cactus-small", age: 0 }),
    ]);

    for (let frame = 0; frame < 14; frame += 1) tickGame(state, 0.04, () => 0.5);
    expect(state.destructionEffects).toHaveLength(0);
  });

  it("boosts speed and increases the next obstacle gap", () => {
    const state = createGameState();
    startGame(state);
    state.spawnTimer = 1;
    applySpeedBoost(state);
    expect(state.spawnTimer).toBe(1.25);
    state.spawnTimer = 0;
    tickGame(state, 1 / 60, () => 0.5);

    expect(state.effects.speed).toBeGreaterThan(6.9);
    expect(state.speed).toBeGreaterThan(340);
    expect(state.spawnTimer).toBeGreaterThan(1.35);
    expect(state.spawnTimer).toBeLessThan(1.5);
  });

  it("queues the rival speed item without boosting its collector", () => {
    const state = createGameState();
    startGame(state);
    state.itemSpawnTimer = 100;
    state.items.push({
      id: 1,
      kind: "speed-rival",
      x: state.runner.x + 10,
      y: state.runner.y + 10,
      width: 42,
      height: 42,
    });

    tickGame(state, 1 / 60, () => 0.5);

    expect(state.effects.speed).toBe(0);
    expect(takeCollectedItems(state)).toEqual(["speed-rival"]);
  });

  it("lets wings flap in mid-air", () => {
    const wingState = createGameState();
    startGame(wingState);
    wingState.effects.wings = 10;
    wingState.runner.grounded = false;
    wingState.runner.velocityY = 100;
    expect(jump(wingState)).toBe(true);
    expect(wingState.runner.velocityY).toBeLessThan(-400);
  });

  it("does not advance while paused", () => {
    const state = createGameState();
    startGame(state);
    pauseGame(state);
    const distance = state.distance;
    tickGame(state, 1, () => 0.5);
    expect(state.distance).toBe(distance);
    resumeGame(state);
    tickGame(state, 1 / 60, () => 0.5);
    expect(state.distance).toBeGreaterThan(distance);
  });

  it("expands the obstacle spawn edge without changing the world scale", () => {
    const state = createGameState();
    setViewportWidth(state, 1800);
    startGame(state);
    state.spawnTimer = 0;
    tickGame(state, 1 / 60, () => 0.5);

    expect(state.viewportWidth).toBe(1800);
    expect(state.obstacles[0]?.x).toBeGreaterThan(1800);
  });
});
