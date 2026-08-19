import {
  GROUND_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type GameState,
  type ObstacleState,
} from "./engine";
import { drawHtmlLayer } from "./htmlCanvas";

export interface GameLayers {
  hud: HTMLElement;
  runner: HTMLElement;
  obstacles: HTMLElement[];
  overlay: HTMLElement;
  controls: HTMLElement;
}

function drawCloud(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  alpha: number,
): void {
  context.globalAlpha = alpha;
  context.fillStyle = "#f7d9a5";
  context.fillRect(x, y + 12 * scale, 70 * scale, 8 * scale);
  context.fillRect(x + 12 * scale, y + 5 * scale, 42 * scale, 9 * scale);
  context.fillRect(x + 26 * scale, y, 22 * scale, 9 * scale);
  context.globalAlpha = 1;
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  const sky = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  sky.addColorStop(0, "#172329");
  sky.addColorStop(0.52, "#9f5650");
  sky.addColorStop(0.8, "#f18b6e");
  sky.addColorStop(1, "#f6ca91");
  context.fillStyle = sky;
  context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  const sunY = 347;
  context.fillStyle = "rgba(255, 227, 166, 0.88)";
  context.beginPath();
  context.arc(696, sunY, 69, Math.PI, 0);
  context.fill();
  context.fillRect(627, sunY, 138, 5);
  context.globalAlpha = 0.2;
  for (let stripe = 0; stripe < 5; stripe += 1) {
    context.fillStyle = "#9f5650";
    context.fillRect(
      632 + stripe * 4,
      sunY - 14 - stripe * 10,
      128 - stripe * 8,
      4,
    );
  }
  context.globalAlpha = 1;

  const parallax = (state.distance * 0.035) % 320;
  drawCloud(context, 68 - parallax, 112, 0.85, 0.3);
  drawCloud(context, 388 - parallax * 0.55, 178, 0.58, 0.26);
  drawCloud(context, 760 - parallax * 0.35, 92, 0.72, 0.36);
  drawCloud(context, 1020 - parallax, 142, 0.76, 0.28);

  context.fillStyle = "#435056";
  context.beginPath();
  context.moveTo(0, GROUND_Y);
  context.lineTo(0, 372);
  context.lineTo(95, 303);
  context.lineTo(178, 368);
  context.lineTo(264, 320);
  context.lineTo(364, 382);
  context.lineTo(470, 326);
  context.lineTo(592, 378);
  context.lineTo(710, 298);
  context.lineTo(824, 370);
  context.lineTo(960, 315);
  context.lineTo(960, GROUND_Y);
  context.closePath();
  context.fill();

  context.fillStyle = "#26373d";
  context.fillRect(0, GROUND_Y, WORLD_WIDTH, WORLD_HEIGHT - GROUND_Y);
  context.fillStyle = "#f5c68d";
  context.fillRect(0, GROUND_Y, WORLD_WIDTH, 4);

  const groundOffset = state.distance % 54;
  context.fillStyle = "rgba(246, 202, 145, 0.62)";
  for (let x = -groundOffset; x < WORLD_WIDTH; x += 54) {
    context.fillRect(x, GROUND_Y + 23, 8, 4);
    context.fillRect(x + 22, GROUND_Y + 48, 4, 4);
  }
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
    drawBackdrop(context, state);

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
