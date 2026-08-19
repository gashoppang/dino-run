import { describe, expect, it, vi } from "vitest";
import { createGameState, startGame } from "./engine";
import { createRenderer, type GameLayers } from "./renderer";

function fakeElement(id: string): HTMLElement {
  return { id, style: { transform: "" } } as unknown as HTMLElement;
}

describe("HTML scene compositor", () => {
  it("draws the HTML backdrop and a visible obstacle before the UI", () => {
    const calls: string[] = [];
    const transform = {
      toString: () => "matrix(1, 0, 0, 1, 0, 0)",
    } as DOMMatrix;
    const context = {
      reset: vi.fn(),
      setTransform: vi.fn(),
      clearRect: vi.fn(),
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
      "obstacle",
      "hud",
      "controls",
    ]);
    expect(context.drawElementImage).toHaveBeenCalledWith(
      obstacle,
      800,
      350,
      52,
      70,
    );
  });
});
