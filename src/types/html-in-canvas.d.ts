interface PaintEvent extends Event {
  readonly changedElements: readonly Element[];
}

interface CanvasRenderingContext2D {
  drawElementImage(
    element: Element,
    x: number,
    y: number,
    width?: number,
    height?: number,
  ): DOMMatrix;
}

interface HTMLCanvasElement {
  layoutSubtree: boolean;
  onpaint: ((this: HTMLCanvasElement, event: PaintEvent) => unknown) | null;
  requestPaint(): void;
}
