import {
  GROUND_Y,
  GAME_CAMERA_TOP,
  GAME_VIEW_HEIGHT,
  WORLD_HEIGHT,
  type DestructionEffectState,
  type GameState,
  type ItemState,
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
  const scale = Math.max(1, pixelHeight) / GAME_VIEW_HEIGHT;
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
  sky.addColorStop(0, "#62bce5");
  sky.addColorStop(0.48, "#a9def0");
  sky.addColorStop(0.78, "#dff1ed");
  sky.addColorStop(1, "#ffe5ad");
  context.fillStyle = sky;
  context.fillRect(0, 0, viewportWidth, WORLD_HEIGHT);

  context.save();
  context.beginPath();
  const sunX = viewportWidth * 0.78;
  context.arc(sunX, 106, 50, 0, Math.PI * 2);
  context.shadowColor = "rgba(255, 222, 115, 0.58)";
  context.shadowBlur = 34;
  context.fillStyle = "#ffe58f";
  context.fill();
  context.restore();

  const cloudShift = -((state.distance * 0.035) % 1080);
  context.fillStyle = "rgba(255, 255, 255, 0.64)";
  for (let offset = -540; offset < viewportWidth + 540; offset += 540) {
    const x = cloudShift + offset;
    context.fillRect(x + 38, 151, 104, 8);
    context.fillRect(x + 58, 141, 63, 10);
    context.fillRect(x + 79, 132, 29, 9);
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
    ], "#9dbbc0");
    polygon(context, [
      [x + 38, GROUND_Y], [x + 153, 312], [x + 222, 391],
      [x + 304, 286], [x + 410, GROUND_Y],
    ], "#779b9f");
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
    ], "#4d7772");
  }
  context.restore();
}

function drawGround(
  context: CanvasRenderingContext2D,
  state: GameState,
  viewportWidth: number,
): void {
  const ground = context.createLinearGradient(0, GROUND_Y, 0, WORLD_HEIGHT);
  ground.addColorStop(0, "#456d61");
  ground.addColorStop(1, "#263f3c");
  context.fillStyle = ground;
  context.fillRect(0, GROUND_Y, viewportWidth, WORLD_HEIGHT - GROUND_Y);
  context.fillStyle = "#f6d68f";
  context.fillRect(0, GROUND_Y, viewportWidth, 4);
  context.fillStyle = "rgba(246, 222, 165, 0.42)";
  const trackShift = -(state.distance % 96);
  for (let x = trackShift - 96; x < viewportWidth + 96; x += 96) {
    context.fillRect(x, GROUND_Y + 31, 20, 4);
    context.fillRect(x + 44, GROUND_Y + 66, 8, 3);
  }
  context.fillStyle = "rgba(166, 224, 205, 0.18)";
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

const DINO_COLOR = "#26383e";

function drawStandingDino(context: CanvasRenderingContext2D, frame: number): void {
  polygon(context, [
    [0, 28], [4, 28], [4, 36], [8, 36], [8, 40], [12, 40], [12, 44],
    [20, 44], [20, 40], [24, 40], [24, 36], [28, 36], [28, 32], [32, 32],
    [32, 28], [36, 28], [36, 8], [40, 8], [40, 4], [64, 4], [64, 8],
    [68, 8], [68, 24], [52, 24], [52, 28], [60, 28], [60, 32], [48, 32],
    [48, 40], [56, 40], [56, 44], [52, 44], [52, 48], [48, 48], [48, 60],
    [44, 60], [44, 64], [40, 64], [40, 68], [16, 68], [16, 64], [12, 64],
    [12, 60], [8, 60], [8, 56], [4, 56], [4, 48], [0, 48],
  ], DINO_COLOR);

  context.fillStyle = DINO_COLOR;
  if (frame === 0) {
    context.fillRect(16, 64, 12, 8);
    context.fillRect(16, 68, 8, 12);
    context.fillRect(16, 76, 12, 6);
    context.fillRect(36, 64, 8, 16);
    context.fillRect(36, 76, 12, 6);
  } else {
    context.fillRect(20, 64, 8, 12);
    context.fillRect(16, 72, 12, 6);
    context.fillRect(36, 64, 12, 8);
    context.fillRect(40, 68, 8, 12);
    context.fillRect(40, 76, 12, 6);
  }

  context.fillStyle = COLORS.cream;
  context.fillRect(44, 10, 4, 4);
}

function drawDuckingDino(context: CanvasRenderingContext2D, frame: number): void {
  polygon(context, [
    [0, 16], [4, 16], [4, 20], [8, 20], [8, 24], [16, 24], [16, 20],
    [20, 20], [20, 16], [32, 16], [32, 8], [36, 8], [36, 4], [64, 4],
    [64, 8], [68, 8], [68, 20], [52, 20], [52, 24], [60, 24], [60, 28],
    [48, 28], [48, 32], [56, 32], [56, 36], [52, 36], [52, 40], [44, 40],
    [44, 44], [16, 44], [16, 40], [12, 40], [12, 36], [8, 36], [8, 32],
    [4, 32], [4, 28], [0, 28],
  ], DINO_COLOR);

  context.fillStyle = DINO_COLOR;
  if (frame === 0) {
    context.fillRect(16, 40, 12, 8);
    context.fillRect(36, 40, 16, 8);
  } else {
    context.fillRect(12, 40, 16, 8);
    context.fillRect(36, 40, 12, 8);
  }

  context.fillStyle = COLORS.cream;
  context.fillRect(44, 9, 4, 4);
}

function drawRunner(context: CanvasRenderingContext2D, state: GameState): void {
  const runner = state.runner;
  const frame = Math.floor(state.elapsed * 11) % 2;
  const artWidth = 68;
  const artHeight = runner.ducking ? 48 : 82;
  context.save();
  context.translate(Math.round(runner.x), Math.round(runner.y));
  if (state.effects.giant > 0) {
    context.translate(runner.width / 2, runner.height);
    context.scale(1.38, 1.38);
    context.translate(-runner.width / 2, -runner.height);
  }
  context.scale(runner.width / artWidth, runner.height / artHeight);

  if (state.effects.speed > 0) {
    context.fillStyle = "rgba(83, 194, 255, 0.24)";
    const streak = (state.elapsed * 120) % 28;
    context.fillRect(-62 - streak, 24, 54, 5);
    context.fillRect(-42 - streak, 52, 34, 4);
  }

  if (state.effects.wings > 0) {
    const wingLift = Math.floor(state.elapsed * 9) % 2 === 0 ? -10 : 5;
    context.fillStyle = "rgba(255, 244, 207, 0.92)";
    polygon(context, [[17, 36], [-19, 8 + wingLift], [-8, 43], [15, 59]], "rgba(255, 244, 207, 0.92)");
    polygon(context, [[48, 37], [88, 10 + wingLift], [75, 45], [51, 59]], "rgba(255, 244, 207, 0.92)");
  }
  context.fillStyle = COLORS.ink;
  context.shadowColor = "rgba(10, 24, 31, 0.28)";
  context.shadowBlur = 0;
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 5;

  if (runner.ducking) drawDuckingDino(context, frame);
  else drawStandingDino(context, frame);

  if (state.effects.shield > 0) {
    context.beginPath();
    context.arc(artWidth / 2, artHeight / 2, 54, 0, Math.PI * 2);
    context.fillStyle = "rgba(91, 225, 226, 0.12)";
    context.fill();
    context.strokeStyle = "rgba(144, 255, 243, 0.86)";
    context.lineWidth = 4;
    context.stroke();
  }
  context.restore();
}

const ITEM_COLORS: Record<ItemState["kind"], string> = {
  shield: "#6ce7df",
  giant: "#ffbd5c",
  "speed-self": "#55bfff",
  "speed-rival": "#ff5e69",
  wings: "#fff1c4",
};

export function drawItem(
  context: CanvasRenderingContext2D,
  item: ItemState,
  elapsed: number,
): void {
  const bob = Math.sin(elapsed * 5 + item.id) * 6;
  const artSize = 42;
  const center = artSize / 2;
  context.save();
  context.translate(Math.round(item.x), Math.round(item.y + bob));
  context.scale(item.width / artSize, item.height / artSize);
  context.fillStyle = "rgba(11, 29, 37, 0.45)";
  context.fillRect(4, 7, artSize, artSize);
  polygon(context, [[center, 0], [artSize, center], [center, artSize], [0, center]], ITEM_COLORS[item.kind]);
  const iconColor = "rgba(18, 43, 52, 0.94)";
  const highlight = "rgba(255, 248, 218, 0.7)";
  context.fillStyle = iconColor;

  if (item.kind === "shield") {
    polygon(context, [[21, 7], [34, 12], [32, 27], [27, 34], [21, 38], [15, 34], [10, 27], [8, 12]], iconColor);
    polygon(context, [[21, 12], [29, 15], [27, 26], [21, 32]], highlight);
  } else if (item.kind === "giant") {
    polygon(context, [
      [21, 6], [29, 8], [35, 14], [36, 21], [32, 27], [10, 27], [6, 21],
      [7, 14], [13, 8],
    ], iconColor);
    context.fillRect(13, 24, 16, 12);
    context.fillStyle = highlight;
    context.fillRect(11, 14, 6, 6);
    context.fillRect(25, 11, 6, 6);
    context.fillRect(17, 26, 8, 8);
    context.fillStyle = iconColor;
    context.fillRect(18, 28, 2, 4);
    context.fillRect(23, 28, 2, 4);
  } else if (item.kind === "speed-self" || item.kind === "speed-rival") {
    polygon(context, [[5, 10], [11, 10], [22, 21], [11, 32], [5, 32], [16, 21]], iconColor);
    polygon(context, [[18, 10], [24, 10], [35, 21], [24, 32], [18, 32], [29, 21]], iconColor);
  } else {
    context.fillRect(19, 14, 4, 23);
    polygon(context, [
      [19, 16], [14, 11], [7, 7], [3, 10], [5, 17], [10, 21], [4, 20],
      [7, 27], [13, 30], [8, 30], [14, 36], [20, 31],
    ], iconColor);
    polygon(context, [
      [23, 16], [28, 11], [35, 7], [39, 10], [37, 17], [32, 21], [38, 20],
      [35, 27], [29, 30], [34, 30], [28, 36], [22, 31],
    ], iconColor);
    context.fillStyle = highlight;
    context.fillRect(7, 14, 9, 3);
    context.fillRect(10, 21, 7, 3);
    context.fillRect(26, 14, 9, 3);
    context.fillRect(25, 21, 7, 3);
  }
  context.restore();
}

export function drawDestructionEffect(
  context: CanvasRenderingContext2D,
  effect: DestructionEffectState,
): void {
  const progress = Math.min(1, effect.age / 0.55);
  const radius = 9 + progress * 68;
  const gravityDrop = progress * progress * 30;
  const directions: Array<readonly [number, number]> = [
    [-1, -0.45], [-0.7, -1], [-0.2, -0.75], [0.35, -1.05], [0.85, -0.55],
    [1, 0.12], [0.65, 0.72], [0.16, 0.92], [-0.48, 0.78], [-0.92, 0.3],
  ];
  context.save();
  context.translate(Math.round(effect.x), Math.round(effect.y));
  context.globalAlpha = 1 - progress;
  context.fillStyle = effect.kind.startsWith("cactus-") ? COLORS.teal : COLORS.coralLight;
  directions.forEach(([directionX, directionY], index) => {
    const size = index % 3 === 0 ? 9 : index % 2 === 0 ? 6 : 4;
    context.fillRect(
      Math.round(directionX * radius - size / 2),
      Math.round(directionY * radius + gravityDrop - size / 2),
      size,
      size,
    );
  });
  if (progress < 0.25) {
    context.fillStyle = COLORS.cream;
    const flashSize = 22 * (1 - progress * 4);
    context.fillRect(-flashSize / 2, -flashSize / 2, flashSize, flashSize);
  }
  context.restore();
}

function drawCactusPart(
  context: CanvasRenderingContext2D,
  clusterHeight: number,
  offsetX: number,
  cactusWidth: number,
  cactusHeight: number,
): void {
  const offsetY = clusterHeight - cactusHeight;
  const unit = Math.max(3, Math.round(cactusWidth / 10));
  context.fillStyle = COLORS.teal;
  context.fillRect(offsetX + cactusWidth * 0.38, offsetY, cactusWidth * 0.3, cactusHeight);
  context.fillRect(offsetX + cactusWidth * 0.08, offsetY + cactusHeight * 0.38, cactusWidth * 0.36, unit * 2);
  context.fillRect(offsetX + cactusWidth * 0.08, offsetY + cactusHeight * 0.2, unit * 2, cactusHeight * 0.34);
  context.fillRect(offsetX + cactusWidth * 0.62, offsetY + cactusHeight * 0.55, cactusWidth * 0.34, unit * 2);
  context.fillRect(offsetX + cactusWidth * 0.78, offsetY + cactusHeight * 0.36, unit * 2, cactusHeight * 0.31);
  context.fillStyle = "rgba(255, 231, 181, 0.46)";
  context.fillRect(offsetX + cactusWidth * 0.46, offsetY + cactusHeight * 0.08, unit, cactusHeight * 0.7);
}

export function drawObstacle(
  context: CanvasRenderingContext2D,
  obstacle: ObstacleState,
  elapsed: number,
): void {
  const { x, y, width, height } = obstacle;
  const artSize = obstacle.kind.startsWith("bird-")
    ? { width: 78, height: 42 }
    : obstacle.kind === "cactus-small"
      ? { width: 34, height: 50 }
      : obstacle.kind === "cactus-large"
        ? { width: 48, height: 82 }
        : obstacle.kind === "cactus-double"
          ? { width: 72, height: 62 }
          : { width: 104, height: 64 };
  context.save();
  context.translate(Math.round(x), Math.round(y));
  context.scale(width / artSize.width, height / artSize.height);
  context.shadowColor = "rgba(12, 30, 35, 0.34)";
  context.shadowBlur = 0;
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 5;

  if (obstacle.kind.startsWith("cactus-")) {
    if (obstacle.kind === "cactus-double") {
      drawCactusPart(context, artSize.height, 0, 34, 56);
      drawCactusPart(context, artSize.height, 38, 34, 62);
    } else if (obstacle.kind === "cactus-triple") {
      drawCactusPart(context, artSize.height, 0, 32, 54);
      drawCactusPart(context, artSize.height, 36, 32, 64);
      drawCactusPart(context, artSize.height, 72, 32, 50);
    } else {
      drawCactusPart(context, artSize.height, 0, artSize.width, artSize.height);
    }
  } else {
    const wingDown = Math.floor(elapsed * 9) % 2 === 1;
    context.fillStyle = COLORS.coralLight;
    context.fillRect(artSize.width * 0.24, artSize.height * 0.34, artSize.width * 0.46, artSize.height * 0.38);
    context.fillRect(artSize.width * 0.65, artSize.height * 0.24, artSize.width * 0.24, artSize.height * 0.3);
    context.fillRect(artSize.width * 0.86, artSize.height * 0.34, artSize.width * 0.14, artSize.height * 0.1);
    context.fillRect(artSize.width * 0.08, artSize.height * 0.54, artSize.width * 0.26, artSize.height * 0.12);
    context.fillRect(
      artSize.width * 0.28,
      wingDown ? artSize.height * 0.58 : 0,
      artSize.width * 0.38,
      artSize.height * 0.26,
    );
    context.fillStyle = COLORS.ink;
    context.fillRect(artSize.width * 0.78, artSize.height * 0.3, 4, 4);
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
  vignette.addColorStop(0, "rgba(29, 76, 88, 0)");
  vignette.addColorStop(1, "rgba(29, 76, 88, 0.14)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, viewportWidth, WORLD_HEIGHT);
}

export function renderGame(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  state: GameState,
): void {
  const { scale, viewportWidth } = getViewportMetrics(canvas.width, canvas.height);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(scale, 0, 0, scale, 0, -GAME_CAMERA_TOP * scale);
  context.imageSmoothingEnabled = false;

  drawSky(context, state, viewportWidth);
  drawMountains(context, state, viewportWidth);
  drawGround(context, state, viewportWidth);
  drawSpeedLines(context, state, viewportWidth);
  drawDust(context, state);
  for (const item of state.items) drawItem(context, item, state.elapsed);
  drawRunner(context, state);
  for (const obstacle of state.obstacles) drawObstacle(context, obstacle, state.elapsed);
  for (const effect of state.destructionEffects) drawDestructionEffect(context, effect);
  drawVignette(context, viewportWidth);
}

export function createCanvasRenderer(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): (state: GameState) => void {
  return (state) => renderGame(canvas, context, state);
}
