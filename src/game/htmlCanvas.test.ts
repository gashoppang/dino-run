import { describe, expect, it, vi } from "vitest";
import { drawHtmlLayer, hasHtmlInCanvasSupport } from "./htmlCanvas";

describe("HTML-in-Canvas adapter", () => {
  it("detects all required experimental primitives", () => {
    expect(
      hasHtmlInCanvasSupport({
        canvasPrototype: { requestPaint() {}, layoutSubtree: true },
        contextPrototype: { drawElementImage() {} },
      }),
    ).toBe(true);
    expect(
      hasHtmlInCanvasSupport({
        canvasPrototype: { requestPaint() {}, layoutSubtree: true },
        contextPrototype: {},
      }),
    ).toBe(false);
  });

  it("draws a layer and synchronizes its CSS transform", () => {
    const transform = {
      toString: () => "matrix(1, 0, 0, 1, 24, 36)",
    } as DOMMatrix;
    const drawElementImage = vi.fn(() => transform);
    const element = { style: { transform: "" } } as HTMLElement;
    const result = drawHtmlLayer(
      { drawElementImage } as unknown as Pick<
        CanvasRenderingContext2D,
        "drawElementImage"
      >,
      element,
      { x: 24, y: 36, width: 100, height: 80 },
    );
    expect(result).toBe(transform);
    expect(drawElementImage).toHaveBeenCalledWith(element, 24, 36, 100, 80);
    expect(element.style.transform).toBe("matrix(1, 0, 0, 1, 24, 36)");
  });
});
