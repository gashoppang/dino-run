import {
  GROUND_Y,
  WORLD_HEIGHT,
  type GameState,
  type ObstacleState,
} from "./engine";

const COLORS = {
  ink: "#172c35",
  cream: "#ffe7b5",
  coral: "#ef765f",
  coralLight: "#ff9a73",
  teal: "#5cb8a7",
  tealDark: "#276b68",
  ground: "#1c333a",
};

export function getViewportMetrics(
  pixelWidth: number,
  pixelHeight: number,
): { scale: number; viewportWidth: number } {
  const scale = Math.max(1, pixelHeight) / WORLD_HEIGHT;
  return {
    scale,
    viewportWidth: Math.max(1, pixelWidth) / scale,
  };
}

function polygon(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fill: string,
): void {
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fillStyle = fill;
  context.fill();
}

function drawSky(
  context: CanvasRenderingContext2D,
  state: GameState,
  viewportWidth: number,
): void {
  const sky = context.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#142b39");
  sky.addColorStop(0.42, "#70485b");
  sky.addColorStop(0.72, "#d56d63");
  sky.addColorStop(1, "#f5ad78");
  context.fillStyle = sky;
  context.fillRect(0, 0, viewportWidth, WORLD_HEIGHT);

  const starAlpha = 0.28 + Math.min(0.42, state.score / 1200);
  context.fillStyle = `rgba(255, 235, 185, ${starAlpha})`;
  const stars: Array<readonly [number, number, number]> = [
    [84, 72, 2], [174, 132, 1], [278, 61, 2], [382, 111, 1],
    [505, 57, 1], [603, 136, 2], [744, 78, 1], [862, 121, 2],
  ];
  for (let offset = 0; offset < viewportWidth + 960; offset += 960) {
    for (const [x, y, size] of stars) context.fillRect(x + offset, y, size, size);
  }

  context.save();
  context.beginPath();
  const sunX = viewportWidth * 0.78;
  context.arc(sunX, 255, 80, Math.PI, 0);
  context.clip();
  context.fillStyle = COLORS.cream;
  context.fillRect(sunX - 80, 175, 160, 84);
  context.fillStyle = "rgba(213, 109, 99, 0.38)";
  for (let line = 0; line < 5; line += 1) {
    context.fillRect(sunX - 78, 200 + line * 13, 158, 4);
  }
  context.restore();

  const cloudShift = -((state.distance * 0.035) % 1080);
  context.fillStyle = "rgba(255, 231, 181, 0.22)";
  for (let offset = -540; offset < viewportWidth + 540; offset += 540) {
    const x = cloudShift + offset;
    context.fillRect(x + 38, 118, 94, 7);
    context.fillRect(x + 58, 109, 54, 9);
    context.fillRect(x + 76, 102, 25, 8);
  }
}

function drawMountains(
  context: CanvasRenderingContext2D,
  state: GameState,
  viewportWidth: number,
): void {
  const backShift = -((state.distance * 0.025) % 360);
  context.save();
  context.translate(backShift, 0);
  for (let repeat = 0; repeat < Math.ceil(viewportWidth / 360) + 2; repeat += 1) {
    const x = repeat * 360;
    polygon(context, [
      [x - 40, GROUND_Y], [x + 72, 258], [x + 152, 368],
      [x + 238, 231], [x + 370, GROUND_Y],
    ], "#665361");
    polygon(context, [
      [x + 38, GROUND_Y], [x + 153, 312], [x + 222, 391],
      [x + 304, 286], [x + 410, GROUND_Y],
    ], "#3b4651");
  }
  context.restore();

  const ridgeShift = -((state.distance * 0.08) % 420);
  context.save();
  context.translate(ridgeShift, 0);
  for (let repeat = 0; repeat < Math.ceil(viewportWidth / 420) + 2; repeat += 1) {
    const x = repeat * 420;
    polygon(context, [
      [x - 30, GROUND_Y], [x + 68, 342], [x + 152, 401],
      [x + 242, 328], [x + 332, 391], [x + 450, GROUND_Y],
    ], "#263c43");
  }
  context.restore();
}

function drawGround(
  context: CanvasRenderingContext2D,
  state: GameState,
  viewportWidth: number,
): void {
  const ground = context.createLinearGradient(0, GROUND_Y, 0, WORLD_HEIGHT);
  ground.addColorStop(0, "#263f45");
  ground.addColorStop(1, "#10252e");
  context.fillStyle = ground;
  context.fillRect(0, GROUND_Y, viewportWidth, WORLD_HEIGHT - GROUND_Y);
  context.fillStyle = COLORS.cream;
  context.fillRect(0, GROUND_Y, viewportWidth, 4);
  context.fillStyle = "rgba(255, 231, 181, 0.28)";
  const trackShift = -(state.distance % 96);
  for (let x = trackShift - 96; x < viewportWidth + 96; x += 96) {
    context.fillRect(x, GROUND_Y + 31, 20, 4);
    context.fillRect(x + 44, GROUND_Y + 66, 8, 3);
  }
  context.fillStyle = "rgba(92, 184, 167, 0.12)";
  context.fillRect(0, GROUND_Y + 92, viewportWidth, 1);
}

function drawDust(context: CanvasRenderingContext2D, state: GameState): void {
  if (state.phase !== "running" || !state.runner.grounded) return;
  const phase = (state.elapsed * 7) % 1;
  context.fillStyle = `rgba(255, 231, 181, ${0.35 * (1 - phase)})`;
  for (let index = 0; index < 4; index += 1) {
    const x = state.runner.x - 8 - phase * 48 - index * 15;
    const y = GROUND_Y - 6 - ((index * 7) % 15) - phase * 12;
    const size = Math.max(2, 6 - index);
    context.fillRect(x, y, size, size);
  }
}

function drawRunner(context: CanvasRenderingContext2D, state: GameState): void {
  const runner = state.runner;
  const frame = Math.floor(state.elapsed * 11) % 2;
  context.save();
  context.translate(Math.round(runner.x), Math.round(runner.y));
  context.fillStyle = COLORS.ink;
  context.shadowColor = "rgba(10, 24, 31, 0.28)";
  context.shadowBlur = 0;
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 5;

  if (runner.ducking) {
    context.fillRect(10, 14, 43, 25);
    context.fillRect(38, 5, 30, 25);
    context.fillRect(0, 18, 23, 12);
    context.fillRect(54, 29, 14, 5);
    context.fillRect(frame === 0 ? 17 : 25, 38, 10, 10);
    context.fillRect(frame === 0 ? 39 : 31, 38, 10, 10);
    context.fillStyle = COLORS.cream;
    context.fillRect(57, 11, 5, 5);
  } else {
    context.fillRect(22, 29, 37, 38);
    context.fillRect(34, 2, 32, 32);
    context.fillRect(52, 27, 16, 8);
    context.fillRect(8, 38, 26, 13);
    context.fillRect(0, 31, 15, 10);
    context.fillRect(49, 44, 18, 7);
    context.fillRect(60, 49, 8, 7);
    context.fillRect(frame === 0 ? 26 : 39, 64, 11, frame === 0 ? 18 : 12);
    context.fillRect(frame === 0 ? 44 : 27, 64, 11, frame === 0 ? 12 : 18);
    context.fillStyle = COLORS.cream;
    context.fillRect(56, 9, 5, 5);
    context.fillRect(57, 25, 11, 3);
  }
  context.restore();
}

export function drawObstacle(
  context: CanvasRenderingContext2D,
  obstacle: ObstacleState,
  elapsed: number,
): void {
  const { x, y, width, height } = obstacle;
  context.save();
  context.translate(Math.round(x), Math.round(y));
  context.shadowColor = "rgba(12, 30, 35, 0.34)";
  context.shadowBlur = 0;
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 5;

  if (obstacle.kind === "cactus") {
    const unit = Math.max(4, Math.round(width / 11));
    context.fillStyle = COLORS.teal;
    context.fillRect(width * 0.4, 0, width * 0.28, height);
    context.fillRect(width * 0.12, height * 0.36, width * 0.34, unit * 2);
    context.fillRect(width * 0.12, height * 0.18, unit * 2, height * 0.34);
    context.fillRect(width * 0.62, height * 0.52, width * 0.34, unit * 2);
    context.fillRect(width * 0.78, height * 0.34, unit * 2, height * 0.32);
    context.fillStyle = "rgba(255, 231, 181, 0.46)";
    context.fillRect(width * 0.47, height * 0.08, unit, height * 0.7);
  } else {
    const wingDown = Math.floor(elapsed * 9) % 2 === 1;
    context.fillStyle = COLORS.coralLight;
    context.fillRect(width * 0.24, height * 0.34, width * 0.46, height * 0.38);
    context.fillRect(width * 0.65, height * 0.24, width * 0.24, height * 0.3);
    context.fillRect(width * 0.86, height * 0.34, width * 0.14, height * 0.1);
    context.fillRect(width * 0.08, height * 0.54, width * 0.26, height * 0.12);
    context.fillRect(
      width * 0.28,
      wingDown ? height * 0.58 : 0,
      width * 0.38,
      height * 0.26,
    );
    context.fillStyle = COLORS.ink;
    context.fillRect(width * 0.78, height * 0.3, 4, 4);
  }
  context.restore();
}

function drawSpeedLines(
  context: CanvasRenderingContext2D,
  state: GameState,
  viewportWidth: number,
): void {
  if (state.phase !== "running" || state.speed < 430) return;
  const alpha = Math.min(0.16, (state.speed - 420) / 1800);
  context.fillStyle = `rgba(255, 231, 181, ${alpha})`;
  const shift = -((state.distance * 1.4) % 230);
  for (let x = shift; x < viewportWidth + 240; x += 230) {
    context.fillRect(x, 190, 82, 2);
    context.fillRect(x + 118, 310, 46, 2);
  }
}

function drawVignette(
  context: CanvasRenderingContext2D,
  viewportWidth: number,
): void {
  const centerX = viewportWidth / 2;
  const radius = Math.max(590, viewportWidth * 0.62);
  const vignette = context.createRadialGradient(centerX, 260, 190, centerX, 270, radius);
  vignette.addColorStop(0, "rgba(5, 17, 23, 0)");
  vignette.addColorStop(1, "rgba(5, 17, 23, 0.34)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, viewportWidth, WORLD_HEIGHT);
}

export function renderGame(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  const { scale, viewportWidth } = getViewportMetrics(canvas.width, canvas.height);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.clearRect(0, 0, viewportWidth, WORLD_HEIGHT);
  context.imageSmoothingEnabled = false;

  drawSky(context, state, viewportWidth);
  drawMountains(context, state, viewportWidth);
  drawGround(context, state, viewportWidth);
  drawSpeedLines(context, state, viewportWidth);
  drawDust(context, state);
  drawRunner(context, state);
  for (const obstacle of state.obstacles) drawObstacle(context, obstacle, state.elapsed);
  drawVignette(context, viewportWidth);
}

export function createCanvasRenderer(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): (state: GameState) => void {
  return (state) => renderGame(canvas, context, state);
}
