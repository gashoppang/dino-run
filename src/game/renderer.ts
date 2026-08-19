import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type GameState,
  type ObstacleState,
} from "./engine";
import { drawHtmlLayer } from "./htmlCanvas";

export interface GameLayers {
  backdrop: HTMLElement;
  hud: HTMLElement;
  runner: HTMLElement;
  obstacles: HTMLElement[];
  overlay: HTMLElement;
  controls: HTMLElement;
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

export function createRenderer(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  layers: GameLayers,
  getState: () => GameState,
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

    drawHtmlLayer(context, layers.hud, {
      x: 675,
      y: 24,
      width: 252,
      height: 104,
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
