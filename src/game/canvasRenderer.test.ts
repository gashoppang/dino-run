import { describe, expect, it, vi } from "vitest";
import {
  drawDestructionEffect,
  drawItem,
  drawObstacle,
  getViewportMetrics,
} from "./canvasRenderer";
import type { DestructionEffectState, ItemState, ObstacleState } from "./engine";

function createContextMock(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    globalAlpha: 1,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } as unknown as CanvasRenderingContext2D;
}

describe("standard canvas obstacle renderer", () => {
  it("keeps one uniform scale and expands a wide split-screen viewport", () => {
    const metrics = getViewportMetrics(1920, 480);

    expect(metrics.scale).toBe(1);
    expect(metrics.viewportWidth).toBe(1920);
  });

  it.each([
    ["cactus-small", 6],
    ["cactus-large", 6],
    ["cactus-double", 12],
    ["cactus-triple", 18],
    ["bird-high", 6],
    ["bird-low", 6],
  ] as const)("draws a visible %s with multiple painted parts", (kind, minimumParts) => {
    const context = createContextMock();
    const obstacle: ObstacleState = {
      id: 1,
      kind,
      x: 600,
      y: kind.startsWith("bird-") ? 340 : 350,
      width: kind.startsWith("bird-")
        ? 78
        : kind === "cactus-triple"
          ? 104
          : kind === "cactus-double"
            ? 72
            : 48,
      height: kind.startsWith("bird-") ? 42 : kind === "cactus-large" ? 82 : 64,
    };

    drawObstacle(context, obstacle, 0.2);

    expect(context.save).toHaveBeenCalledOnce();
    expect(context.translate).toHaveBeenCalledWith(600, obstacle.y);
    expect(context.fillRect).toHaveBeenCalledTimes(minimumParts);
    expect(context.restore).toHaveBeenCalledOnce();
  });

  it.each([
    "shield",
    "giant",
    "speed-self",
    "speed-rival",
    "wings",
  ] as const)("draws a visible %s pickup", (kind) => {
    const context = createContextMock();
    const item: ItemState = { id: 1, kind, x: 640, y: 300, width: 42, height: 42 };

    drawItem(context, item, 0.2);

    expect(context.save).toHaveBeenCalledOnce();
    expect(context.translate).toHaveBeenCalledOnce();
    expect(context.fill).toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalledOnce();
  });

  it("draws giant-destruction pixel fragments", () => {
    const context = createContextMock();
    const effect: DestructionEffectState = {
      id: 1,
      kind: "cactus-large",
      x: 220,
      y: 370,
      age: 0.16,
    };

    drawDestructionEffect(context, effect);

    expect(context.translate).toHaveBeenCalledWith(220, 370);
    expect(context.fillRect).toHaveBeenCalledTimes(10);
    expect(context.restore).toHaveBeenCalledOnce();
  });
});
