// Motor de Tetris ("CAÍDA") portado de references/started-games/03-tetris/game.js
// Todo el estado vive dentro de la closure devuelta por createCaidaGame
// (sin globals de módulo), mismo patrón que lib/games/asteroids/engine.ts.

import type {
  ArcadeGameState,
  ArcadeGameCallbacks,
  ArcadeGameHandle,
  ArcadeGameOptions,
} from "@/lib/games/types";
import { DEFAULT_SKIN, type ArcadeSkinId } from "@/lib/games/skins";
import { CAIDA_SKINS } from "@/lib/games/caida/skins";

export function createCaidaGame(
  canvas: HTMLCanvasElement,
  callbacks: ArcadeGameCallbacks,
  options?: ArcadeGameOptions
): ArcadeGameHandle {
  const ctx = canvas.getContext("2d")!;
  const W = 800;
  const H = 600;

  // Paleta activa: vive en la closure (no en el módulo) para que
  // React Strict Mode pueda montar dos instancias sin colisionar.
  let palette = CAIDA_SKINS[options?.skin ?? DEFAULT_SKIN];

  // ── Constantes del tablero ────────────────────────────────────────────
  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30;
  const BOARD_X = 60;
  const BOARD_Y = 0;
  const PANEL_X = 420;

  const PIECES: (number[][] | null)[] = [
    null,
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ], // I
    [
      [2, 2],
      [2, 2],
    ], // O
    [
      [0, 3, 0],
      [3, 3, 3],
      [0, 0, 0],
    ], // T
    [
      [0, 4, 4],
      [4, 4, 0],
      [0, 0, 0],
    ], // S
    [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0],
    ], // Z
    [
      [6, 0, 0],
      [6, 6, 6],
      [0, 0, 0],
    ], // J
    [
      [0, 0, 7],
      [7, 7, 7],
      [0, 0, 0],
    ], // L
    [
      [8, 8, 8],
      [8, 0, 8],
      [8, 8, 8],
    ], // N (tuerca)
  ];

  const LINE_SCORES = [0, 100, 300, 500, 800];

  // ── Input ──────────────────────────────────────────────────────────────
  const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyX"]);

  function onKeyDown(e: KeyboardEvent) {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (status === "gameover" || !running) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
    notifyState();
  }
  function onKeyUp() {
    // Tetris no necesita estado de tecla sostenida: cada movimiento reacciona
    // a keydown (con el repeat nativo del navegador), igual que el original.
  }

  // ── Tipos internos ────────────────────────────────────────────────────
  type Board = number[][];
  interface Piece {
    type: number;
    shape: number[][];
    x: number;
    y: number;
  }

  function createBoard(): Board {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const type = Math.floor(Math.random() * 8) + 1;
    const shape = PIECES[type]!.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape: number[][]): number[][] {
    const rows = shape.length;
    const cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] || 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      status = "gameover";
    }
  }

  // ── Estado mutable (closure, sin globals de módulo) ────────────────────
  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropAccum = 0;
  let dropInterval = 1000;
  let status: ArcadeGameState["status"] = "playing";

  let lastNotified: ArcadeGameState | null = null;

  function notifyState() {
    const lives = status === "gameover" ? 0 : 1;
    if (
      lastNotified &&
      lastNotified.score === score &&
      lastNotified.lives === lives &&
      lastNotified.level === level &&
      lastNotified.status === status
    ) {
      return;
    }
    lastNotified = { score, lives, level, status };
    callbacks.onStateChange(lastNotified);
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropAccum = 0;
    dropInterval = 1000;
    status = "playing";
    next = randomPiece();
    spawn();
  }

  // ── Dibujo ─────────────────────────────────────────────────────────────
  function drawBlock(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    colorIndex: number,
    ox: number,
    oy: number,
    size: number,
    alpha?: number
  ) {
    if (!colorIndex) return;
    const color = palette.pieceColors[colorIndex];
    context.globalAlpha = alpha ?? 1;
    if (palette.glowBlur > 0) {
      context.shadowColor = color;
      context.shadowBlur = palette.glowBlur;
    }
    context.fillStyle = color;
    context.fillRect(ox + x * size + 1, oy + y * size + 1, size - 2, size - 2);
    context.shadowBlur = 0;
    context.fillStyle = palette.blockHighlight;
    context.fillRect(ox + x * size + 1, oy + y * size + 1, size - 2, 4);
    context.globalAlpha = 1;
  }

  function drawBoard() {
    ctx.strokeStyle = palette.gridLine;
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
      ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
      ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
      ctx.stroke();
    }

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BOARD_X, BOARD_Y, BLOCK);

    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BOARD_X, BOARD_Y, BLOCK, 0.2);

    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(
            ctx,
            current.x + c,
            current.y + r,
            current.shape[r][c],
            BOARD_X,
            BOARD_Y,
            BLOCK
          );
  }

  function drawNext() {
    const NB = 20;
    const nx = PANEL_X;
    const ny = 150;
    ctx.fillStyle = palette.panelLabel;
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", nx, ny - 10);
    const shape = next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(ctx, offX + c, offY + r, shape[r][c], nx, ny, NB);
  }

  function drawHUD() {
    ctx.fillStyle = palette.hudText;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE  ${score}`, PANEL_X, 30);
    ctx.fillText(`LINES  ${lines}`, PANEL_X, 60);
    ctx.fillText(`LEVEL  ${level}`, PANEL_X, 90);
    drawNext();
  }

  function draw() {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);
    drawBoard();
    drawHUD();
  }

  // ── Loop principal ────────────────────────────────────────────────────
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let running = false;

  function update(dt: number) {
    if (status === "gameover") return;
    dropAccum += dt * 1000;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
      notifyState();
    }
  }

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
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
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
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  function setSkin(next: ArcadeSkinId) {
    palette = CAIDA_SKINS[next];
  }

  return { start, pause, resume, stop, setSkin };
}
