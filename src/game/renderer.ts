import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type GameState,
  type ObstacleState,
} from "./engine";
import { drawHtmlLayer, drawHtmlSnapshot } from "./htmlCanvas";

export interface GameLayers {
  backdrop: HTMLElement;
  hud: HTMLElement;
  runner: HTMLElement;
  obstacles: HTMLElement[];
  overlay: HTMLElement;
  controls: HTMLElement;
  scope: HTMLElement;
}

function obstacleLayerRect(obstacle: ObstacleState): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: obstacle.x,
    y: obstacle.y,
    width: obstacle.width,
    height: obstacle.height,
  };
}

const SCOPE_VIEW = {
  x: 29,
  y: 48,
  width: 228,
  height: 80,
};

function drawRunnerEchoes(
  context: CanvasRenderingContext2D,
  layers: GameLayers,
  state: GameState,
): void {
  if (state.phase !== "running") return;

  const echoes = [
    { offsetX: 74, offsetY: 8, alpha: 0.08 },
    { offsetX: 48, offsetY: 5, alpha: 0.12 },
    { offsetX: 25, offsetY: 2, alpha: 0.18 },
  ];

  context.save();
  context.globalCompositeOperation = "screen";
  context.filter = "sepia(1) saturate(2.2) hue-rotate(118deg)";
  for (const echo of echoes) {
    context.globalAlpha = echo.alpha;
    drawHtmlSnapshot(context, layers.runner, {
      x: state.runner.x - echo.offsetX,
      y: state.runner.y + echo.offsetY,
      width: state.runner.width,
      height: state.runner.height,
    });
  }
  context.restore();
}

function drawDomScope(
  context: CanvasRenderingContext2D,
  layers: GameLayers,
  state: GameState,
): void {
  context.save();
  context.beginPath();
  context.rect(
    SCOPE_VIEW.x,
    SCOPE_VIEW.y,
    SCOPE_VIEW.width,
    SCOPE_VIEW.height,
  );
  context.clip();
  context.translate(SCOPE_VIEW.x, SCOPE_VIEW.y);
  context.scale(SCOPE_VIEW.width / WORLD_WIDTH, SCOPE_VIEW.height / WORLD_HEIGHT);
  context.globalAlpha = 0.84;
  context.filter = "saturate(0.72) contrast(1.18) brightness(0.78)";

  drawHtmlSnapshot(context, layers.backdrop, {
    x: 0,
    y: 0,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  });
  drawHtmlSnapshot(context, layers.runner, {
    x: state.runner.x,
    y: state.runner.y,
    width: state.runner.width,
    height: state.runner.height,
  });
  state.obstacles.slice(0, layers.obstacles.length).forEach((obstacle, index) => {
    const layer = layers.obstacles[index];
    if (layer) drawHtmlSnapshot(context, layer, obstacleLayerRect(obstacle));
  });
  context.restore();
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  layers: GameLayers,
  getState: () => GameState,
  effectsEnabled: () => boolean = () => true,
): () => void {
  return () => {
    const state = getState();
    context.reset();
    context.setTransform(
      canvas.width / WORLD_WIDTH,
      0,
      0,
      canvas.height / WORLD_HEIGHT,
      0,
      0,
    );
    context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    drawHtmlLayer(context, layers.backdrop, {
      x: 0,
      y: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    });

    if (effectsEnabled()) drawRunnerEchoes(context, layers, state);

    const runner = state.runner;
    drawHtmlLayer(context, layers.runner, {
      x: runner.x,
      y: runner.y,
      width: runner.width,
      height: runner.height,
    });

    state.obstacles
      .slice(0, layers.obstacles.length)
      .forEach((obstacle, index) => {
        const layer = layers.obstacles[index];
        if (!layer) return;
        drawHtmlLayer(context, layer, obstacleLayerRect(obstacle));
      });

    drawDomScope(context, layers, state);

    drawHtmlLayer(context, layers.hud, {
      x: 675,
      y: 24,
      width: 252,
      height: 104,
    });
    drawHtmlLayer(context, layers.scope, {
      x: 24,
      y: 22,
      width: 238,
      height: 110,
    });


    if (state.phase !== "running") {
      drawHtmlLayer(context, layers.overlay, {
        x: 270,
        y: 146,
        width: 420,
        height: 224,
      });
    }

    drawHtmlLayer(context, layers.controls, {
      x: 717,
      y: 438,
      width: 210,
      height: 72,
    });
  };
}
