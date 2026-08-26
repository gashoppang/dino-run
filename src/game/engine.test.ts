import { describe, expect, it } from "vitest";
import {
  GROUND_Y,
  createGameState,
  jump,
  pauseGame,
  resumeGame,
  setDucking,
  setViewportWidth,
  startGame,
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

    expect(tightGap).toBeCloseTo(0.845);
    expect(normalGap).toBeCloseTo(1.3);
    expect(breatherGap).toBeCloseTo(1.995);
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
