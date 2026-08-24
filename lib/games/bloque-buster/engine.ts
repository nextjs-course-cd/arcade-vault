// Motor de Bloque Buster (Arkanoid) portado de references/started-games/04-arkanoid/
// (game.js + levels.js + assets/spritesheet.js). Todo el estado vive dentro de la
// closure devuelta por createBloqueBusterGame (sin globals de módulo) para poder
// montar/desmontar instancias desde React sin colisiones (p. ej. Strict Mode
// montando efectos dos veces).

import type {
  ArcadeGameState,
  ArcadeGameCallbacks,
  ArcadeGameHandle,
  ArcadeGameOptions,
} from "@/lib/games/types";
import type { ArcadeSkinId } from "@/lib/games/skins";
import { DEFAULT_SKIN } from "@/lib/games/skins";
import { BLOQUE_BUSTER_SKINS } from "@/lib/games/bloque-buster/skins";

export type BloqueBusterState = ArcadeGameState;
export type BloqueBusterGameCallbacks = ArcadeGameCallbacks;
export type BloqueBusterGameHandle = ArcadeGameHandle;

const SPRITESHEET_SRC = "/games/bloque-buster/spritesheet-breakout.png";
const BOUNCE_SOUND_SRC = "/games/bloque-buster/sounds/ball-bounce.mp3";
const BREAK_SOUND_SRC = "/games/bloque-buster/sounds/break-sound.mp3";

type BlockColor = "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

interface LevelBlock {
  col: number;
  row: number;
  color: BlockColor;
}

interface Level {
  speed: number;
  blocks: LevelBlock[];
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
}

interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export function createBloqueBusterGame(
  canvas: HTMLCanvasElement,
  callbacks: BloqueBusterGameCallbacks,
  options?: ArcadeGameOptions
): BloqueBusterGameHandle {
  const ctx = canvas.getContext("2d")!;
  const W = 800;
  const H = 600;

  // Paleta activa (closure, no variable de módulo) para no colisionar entre
  // instancias montadas por React Strict Mode.
  let palette = BLOQUE_BUSTER_SKINS[options?.skin ?? DEFAULT_SKIN];

  // ── Constantes ─────────────────────────────────────────────────────────
  const PADDLE_SPEED = 400;
  const BLOCK_COLS = 10;
  const BLOCK_ROWS = 6;
  const BLOCK_W = 64;
  const BLOCK_H = 24;
  const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
  const BLOCKS_ORIGIN_Y = 80;
  const BASE_BALL_VX = 200;
  const BASE_BALL_VY = -300;

  const EXPLOSION_DURATION = 150;

  // ── Niveles (portado de levels.js) ────────────────────────────────────
  const LEVELS: Level[] = (() => {
    const rowColors1: BlockColor[] = ["red", "yellow", "cyan", "magenta", "hotpink", "green"];
    const rowColors2: BlockColor[] = ["gray", "cyan", "hotpink", "yellow", "magenta", "green"];
    const rowColors4: BlockColor[] = ["cyan", "magenta", "green", "yellow", "hotpink", "red"];

    const l1: LevelBlock[] = [];
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 10; col++) l1.push({ col, row, color: rowColors1[row] });

    const l2: LevelBlock[] = [];
    const pyStart = [4, 3, 2, 1, 0, 0];
    const pyEnd = [5, 6, 7, 8, 9, 9];
    for (let row = 0; row < 6; row++)
      for (let col = pyStart[row]; col <= pyEnd[row]; col++)
        l2.push({ col, row, color: rowColors2[row] });

    const l3: LevelBlock[] = [];
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 10; col++)
        if ((col + row) % 2 === 0) l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

    const gaps4 = [
      [2, 5, 8],
      [0, 4, 7, 9],
      [1, 3, 6],
      [2, 5, 8, 9],
      [0, 4, 7],
      [1, 3, 6, 9],
    ];
    const l4: LevelBlock[] = [];
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 10; col++)
        if (!gaps4[row].includes(col)) l4.push({ col, row, color: rowColors4[row] });

    const l5: LevelBlock[] = [];
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 10; col++) {
        const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
        const isCross = col === 4 || row === 2;
        if (isFrame || isCross)
          l5.push({ col, row, color: isCross && !isFrame ? "hotpink" : "cyan" });
      }

    return [
      { speed: 1.0, blocks: l1 },
      { speed: 1.1, blocks: l2 },
      { speed: 1.21, blocks: l3 },
      { speed: 1.33, blocks: l4 },
      { speed: 1.46, blocks: l5 },
    ];
  })();

  // ── Spritesheet (portado de assets/spritesheet.js) ───────────────────
  const EXPLOSION_FRAMES: Record<BlockColor, SpriteRect[]> = {
    red: [
      { sx: 256, sy: 176, sw: 32, sh: 16 },
      { sx: 288, sy: 176, sw: 32, sh: 16 },
      { sx: 320, sy: 176, sw: 32, sh: 16 },
      { sx: 352, sy: 176, sw: 32, sh: 16 },
    ],
    cyan: [
      { sx: 256, sy: 192, sw: 32, sh: 16 },
      { sx: 288, sy: 192, sw: 32, sh: 16 },
      { sx: 320, sy: 192, sw: 32, sh: 16 },
      { sx: 352, sy: 192, sw: 32, sh: 16 },
    ],
    green: [
      { sx: 256, sy: 208, sw: 32, sh: 16 },
      { sx: 288, sy: 208, sw: 32, sh: 16 },
      { sx: 320, sy: 208, sw: 32, sh: 16 },
      { sx: 352, sy: 208, sw: 32, sh: 16 },
    ],
    magenta: [
      { sx: 256, sy: 224, sw: 32, sh: 16 },
      { sx: 288, sy: 224, sw: 32, sh: 16 },
      { sx: 320, sy: 224, sw: 32, sh: 16 },
      { sx: 352, sy: 224, sw: 32, sh: 16 },
    ],
    yellow: [
      { sx: 256, sy: 240, sw: 32, sh: 16 },
      { sx: 288, sy: 240, sw: 32, sh: 16 },
      { sx: 320, sy: 240, sw: 32, sh: 16 },
      { sx: 352, sy: 240, sw: 32, sh: 16 },
    ],
    hotpink: [
      { sx: 256, sy: 256, sw: 32, sh: 16 },
      { sx: 288, sy: 256, sw: 32, sh: 16 },
      { sx: 320, sy: 256, sw: 32, sh: 16 },
      { sx: 352, sy: 256, sw: 32, sh: 16 },
    ],
    gray: [
      { sx: 256, sy: 176, sw: 32, sh: 16 },
      { sx: 288, sy: 176, sw: 32, sh: 16 },
      { sx: 320, sy: 176, sw: 32, sh: 16 },
      { sx: 352, sy: 176, sw: 32, sh: 16 },
    ],
  };

  const SPRITES = {
    paddle: { sx: 32, sy: 112, sw: 162, sh: 14 } as SpriteRect,
    ball: { sx: 32, sy: 32, sw: 16, sh: 16 } as SpriteRect,
    blocks: {
      gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
      red: { sx: 32, sy: 176, sw: 32, sh: 16 },
      yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
      cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
      magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
      hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
      green: { sx: 32, sy: 208, sw: 32, sh: 16 },
    } as Record<BlockColor, SpriteRect>,
  };

  // Imagen cruda del spritesheet (sin teñir) y canvas offscreen ya teñido con
  // el filtro de la skin activa. Cambiar de skin reprocesa rawImg sin volver
  // a pedir el .png de red.
  let rawSpritesheet: HTMLImageElement | null = null;
  let ssImg: HTMLCanvasElement | null = null;
  let ssLoaded = false;

  function tintSpritesheet() {
    if (!rawSpritesheet) return;
    const oc = document.createElement("canvas");
    oc.width = rawSpritesheet.width;
    oc.height = rawSpritesheet.height;
    const octx = oc.getContext("2d")!;
    octx.filter = palette.spriteFilter;
    octx.drawImage(rawSpritesheet, 0, 0);
    ssImg = oc;
  }

  function loadSpritesheet(cb: () => void) {
    const rawImg = new Image();
    rawImg.onload = () => {
      rawSpritesheet = rawImg;
      tintSpritesheet();
      ssLoaded = true;
      cb();
    };
    rawImg.onerror = () => console.error("Failed to load spritesheet");
    rawImg.src = SPRITESHEET_SRC;
  }

  function drawFrame(frame: SpriteRect, x: number, y: number, w: number, h: number) {
    if (!ssLoaded || !ssImg) return;
    ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
  }

  function drawSprite(
    name: "paddle" | "ball" | `block_${BlockColor}`,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    if (!ssLoaded || !ssImg) return;
    const sp: SpriteRect | undefined = name.startsWith("block_")
      ? SPRITES.blocks[name.slice(6) as BlockColor]
      : SPRITES[name as "paddle" | "ball"];
    if (!sp) return;
    ctx.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
  }

  // ── Sonido ─────────────────────────────────────────────────────────────
  const bounceSound = new Audio(BOUNCE_SOUND_SRC);
  const breakSound = new Audio(BREAK_SOUND_SRC);
  const playBounce = () => (bounceSound.cloneNode(true) as HTMLAudioElement).play().catch(() => {});
  const playBreak = () => (breakSound.cloneNode(true) as HTMLAudioElement).play().catch(() => {});

  // ── Input ──────────────────────────────────────────────────────────────
  const keys: Record<string, boolean> = {};
  const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"]);

  function onKeyDown(e: KeyboardEvent) {
    if (GAME_KEYS.has(e.key)) e.preventDefault();
    keys[e.key] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
  }
  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  }

  // ── Estado del juego ───────────────────────────────────────────────────
  const paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = 3;
  let score = 0;
  let currentLevel = 1;
  let state: BloqueBusterState["status"] = "playing";

  function initPaddle() {
    paddle.x = (W - paddle.w) / 2;
  }

  function initBall() {
    const speed = LEVELS[currentLevel - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    currentLevel = n;
    const level = LEVELS[n - 1];
    blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    initBall();
  }

  function initGame() {
    score = 0;
    lives = 3;
    state = "playing";
    initPaddle();
    loadLevel(1);
  }

  function collideAABB(block: Block): boolean {
    return (
      ball.x < block.x + block.w &&
      ball.x + ball.w > block.x &&
      ball.y < block.y + block.h &&
      ball.y + ball.h > block.y
    );
  }

  function notifyState() {
    callbacks.onStateChange({ score, lives, level: currentLevel, status: state });
  }

  // ── Update ─────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state !== "playing") {
      notifyState();
      return;
    }

    if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.ArrowRight) paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      playBounce();
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      playBounce();
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      playBounce();
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      playBounce();
    }

    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += 10;
        ball.vy = -ball.vy;
        playBreak();
        if (blocks.every((b) => !b.alive)) {
          if (currentLevel < 5) loadLevel(currentLevel + 1);
          else state = "gameover";
        }
        break;
      }
    }

    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        state = "gameover";
      } else {
        initBall();
      }
    }

    notifyState();
  }

  // ── Draw ───────────────────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);

    for (const block of blocks) {
      if (block.alive) drawSprite(`block_${block.color}`, block.x, block.y, block.w, block.h);
    }

    for (const exp of explosions) {
      const frameIndex = Math.min(Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4), 3);
      drawFrame(EXPLOSION_FRAMES[exp.color][frameIndex], exp.x, exp.y, exp.w, exp.h);
    }

    drawSprite("paddle", paddle.x, paddle.y, paddle.w, paddle.h);
    drawSprite("ball", ball.x, ball.y, ball.w, ball.h);

    ctx.fillStyle = palette.hudText;
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Score: " + score, 10, 10);
    ctx.textAlign = "center";
    ctx.fillText("Nivel: " + currentLevel, W / 2, 10);
    const ballSize = 16;
    const ballSpacing = 4;
    for (let i = 0; i < lives; i++) {
      const bx = W - 10 - (lives - i) * (ballSize + ballSpacing);
      drawSprite("ball", bx, 10, ballSize, ballSize);
    }
  }

  // ── Loop principal ────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let running = false;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw();
    if (running) rafId = requestAnimationFrame(loop);
  }

  function start() {
    initGame();
    notifyState();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousemove", onMouseMove);
    running = true;
    lastTime = null;

    if (ssLoaded) {
      rafId = requestAnimationFrame(loop);
    } else {
      loadSpritesheet(() => {
        if (running) rafId = requestAnimationFrame(loop);
      });
    }
  }

  function pause() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resume() {
    if (running) return;
    running = true;
    lastTime = null;
    if (ssLoaded) rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("mousemove", onMouseMove);
  }

  function setSkin(next: ArcadeSkinId) {
    palette = BLOQUE_BUSTER_SKINS[next];
    // Reprocesa el spritesheet crudo ya cargado con el nuevo filtro; el fondo
    // y el texto HUD se leen de `palette` en cada draw() sin más trabajo.
    tintSpritesheet();
  }

  return { start, pause, resume, stop, setSkin };
}
