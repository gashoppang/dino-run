export interface HtmlCanvasCapabilitySource {
  canvasPrototype: object;
  contextPrototype: object;
}

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function hasHtmlInCanvasSupport(
  source: HtmlCanvasCapabilitySource,
): boolean {
  return (
    "requestPaint" in source.canvasPrototype &&
    "layoutSubtree" in source.canvasPrototype &&
    "drawElementImage" in source.contextPrototype
  );
}

export function browserSupportsHtmlInCanvas(): boolean {
  if (
    typeof HTMLCanvasElement === "undefined" ||
    typeof CanvasRenderingContext2D === "undefined"
  ) {
    return false;
  }
  return hasHtmlInCanvasSupport({
    canvasPrototype: HTMLCanvasElement.prototype,
    contextPrototype: CanvasRenderingContext2D.prototype,
  });
}

export function drawHtmlLayer(
  context: Pick<CanvasRenderingContext2D, "drawElementImage">,
  element: HTMLElement,
  rect: DrawRect,
): DOMMatrix {
  const transform = context.drawElementImage(
    element,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
  );
  element.style.transform = transform.toString();
  return transform;
}

export function drawHtmlSnapshot(
  context: Pick<CanvasRenderingContext2D, "drawElementImage">,
  element: HTMLElement,
  rect: DrawRect,
): DOMMatrix {
  return context.drawElementImage(
    element,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
  );
}
