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

  it("ends the game and updates the best score on collision", () => {
    const state = createGameState(2);
    startGame(state);
    state.score = 8;
    state.distance = 96;
    state.obstacles.push({
      id: 1,
      kind: "cactus",
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
