import { describe, expect, it, vi } from "vitest";
import { drawObstacle, getViewportMetrics } from "./canvasRenderer";
import type { ObstacleState } from "./engine";

function createContextMock(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } as unknown as CanvasRenderingContext2D;
}

describe("standard canvas obstacle renderer", () => {
  it("keeps one uniform scale and expands a wide split-screen viewport", () => {
    const metrics = getViewportMetrics(1920, 540);

    expect(metrics.scale).toBe(1);
    expect(metrics.viewportWidth).toBe(1920);
  });

  it.each([
    ["cactus", 6],
    ["bird", 6],
  ] as const)("draws a visible %s with multiple painted parts", (kind, minimumParts) => {
    const context = createContextMock();
    const obstacle: ObstacleState = {
      id: 1,
      kind,
      x: 600,
      y: kind === "bird" ? 344 : 350,
      width: kind === "bird" ? 78 : 52,
      height: kind === "bird" ? 42 : 70,
    };

    drawObstacle(context, obstacle, 0.2);

    expect(context.save).toHaveBeenCalledOnce();
    expect(context.translate).toHaveBeenCalledWith(600, obstacle.y);
    expect(context.fillRect).toHaveBeenCalledTimes(minimumParts);
    expect(context.restore).toHaveBeenCalledOnce();
  });
});
