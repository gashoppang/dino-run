import { describe, expect, it, vi } from "vitest";
import { createGameState, startGame } from "./engine";
import { createRenderer, type GameLayers } from "./renderer";

function fakeElement(id: string): HTMLElement {
  return { id, style: { transform: "" } } as unknown as HTMLElement;
}

describe("HTML scene compositor", () => {
  it("resamples live HTML into echoes and a second camera before interactive UI", () => {
    const calls: string[] = [];
    const transform = {
      toString: () => "matrix(1, 0, 0, 1, 0, 0)",
    } as DOMMatrix;
    const context = {
      reset: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      drawElementImage: vi.fn((element: HTMLElement) => {
        calls.push(element.id);
        return transform;
      }),
    } as unknown as CanvasRenderingContext2D;
    const canvas = { width: 960, height: 540 } as HTMLCanvasElement;
    const obstacle = fakeElement("obstacle");
    const layers: GameLayers = {
      backdrop: fakeElement("backdrop"),
      hud: fakeElement("hud"),
      runner: fakeElement("runner"),
      obstacles: [obstacle],
      overlay: fakeElement("overlay"),
      controls: fakeElement("controls"),
      scope: fakeElement("scope"),
    };
    const state = createGameState();
    startGame(state);
    state.obstacles.push({
      id: 1,
      kind: "cactus",
      x: 800,
      y: 350,
      width: 52,
      height: 70,
    });

    createRenderer(canvas, context, layers, () => state)();

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 960, 540);
    expect(calls).toEqual([
      "backdrop",
      "runner",
      "runner",
      "runner",
      "runner",
      "obstacle",
      "backdrop",
      "runner",
      "obstacle",
      "hud",
      "scope",
      "controls",
    ]);
    expect(context.drawElementImage).toHaveBeenCalledWith(
      obstacle,
      800,
      350,
      52,
      70,
    );
    expect(calls.filter((id) => id === "backdrop")).toHaveLength(2);
    expect(calls.filter((id) => id === "runner")).toHaveLength(5);
    expect(calls.filter((id) => id === "obstacle")).toHaveLength(2);
    expect(layers.scope.style.transform).toContain("matrix");
  });
});
