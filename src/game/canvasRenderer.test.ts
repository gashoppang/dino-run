import { describe, expect, it, vi } from "vitest";
import {
  drawDestructionEffect,
  drawItem,
  drawObstacle,
  getViewportMetrics,
} from "./canvasRenderer";
import type { DestructionEffectState, ItemState, ObstacleState } from "./engine";

type MockContext = CanvasRenderingContext2D & {
  fillRect: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
};

function createContextMock(): MockContext {
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
    scale: vi.fn(),
    fillStyle: "",
    globalAlpha: 1,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } as unknown as MockContext;
}

describe("standard canvas obstacle renderer", () => {
  it("keeps one uniform scale and expands a wide split-screen viewport", () => {
    const metrics = getViewportMetrics(1920, 400);

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
        ? 92
        : kind === "cactus-triple"
          ? 123
          : kind === "cactus-double"
            ? 85
            : kind === "cactus-large"
              ? 57
              : 40,
      height: kind.startsWith("bird-")
        ? 50
        : kind === "cactus-large"
          ? 97
          : kind === "cactus-small"
            ? 59
            : kind === "cactus-double"
              ? 73
              : 76,
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
    const item: ItemState = { id: 1, kind, x: 640, y: 300, width: 50, height: 50 };

    drawItem(context, item, 0.2);

    expect(context.save).toHaveBeenCalledOnce();
    expect(context.translate).toHaveBeenCalledOnce();
    expect(context.fill).toHaveBeenCalled();
    expect(context.restore).toHaveBeenCalledOnce();
  });

  it("keeps the item background centered on the icon", () => {
    const context = createContextMock();
    const item: ItemState = {
      id: 1,
      kind: "speed-self",
      x: 640,
      y: 300,
      width: 50,
      height: 50,
    };

    drawItem(context, item, 0);

    expect(context.translate).toHaveBeenCalledWith(640, expect.any(Number));
    expect(context.scale).toHaveBeenCalledWith(50 / 42, 50 / 42);
    expect(context.fillRect).not.toHaveBeenCalled();
    expect(context.moveTo.mock.calls[0]).toEqual([21, -2]);
    expect(context.moveTo.mock.calls[1]).toEqual([21, 2]);
  });

  it("draws the same double-chevron icon for both speed boosts", () => {
    const selfContext = createContextMock();
    const rivalContext = createContextMock();
    const baseItem: Omit<ItemState, "kind"> = {
      id: 1,
      x: 640,
      y: 300,
      width: 50,
      height: 50,
    };

    drawItem(selfContext, { ...baseItem, kind: "speed-self" }, 0);
    drawItem(rivalContext, { ...baseItem, kind: "speed-rival" }, 0);

    expect(rivalContext.moveTo.mock.calls).toEqual(selfContext.moveTo.mock.calls);
    expect(rivalContext.lineTo.mock.calls).toEqual(selfContext.lineTo.mock.calls);
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
