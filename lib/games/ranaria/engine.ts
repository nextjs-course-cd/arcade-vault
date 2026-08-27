// Motor de RANARIA (cruce de carriles tipo Frogger), diseñado desde cero
// contra el contrato ArcadeGameHandle (lib/games/types.ts). Todo el estado
// (rana, carriles, temporizador, score, vidas, nivel) vive dentro de la
// closure devuelta por createRanariaGame — sin globals de módulo, para que
// React Strict Mode pueda montar/desmontar instancias sin colisiones.

import type { ArcadeGameState, ArcadeGameCallbacks, ArcadeGameHandle } from "@/lib/games/types";

export type RanariaState = ArcadeGameState;
export type RanariaGameCallbacks = ArcadeGameCallbacks;
export type RanariaGameHandle = ArcadeGameHandle;

// ── Modelo de datos (ver spec: sección "Modelo de datos") ──────────────────
type LaneKind = "goal" | "river" | "safe" | "road";

interface Lane {
  row: number; // 0-11
  kind: LaneKind;
  direction: 1 | -1;
  speed: number; // px/s, escalado por nivel
  obstacles: Obstacle[];
}

interface Obstacle {
  x: number; // px, puede salir del rango [0, 800] y wrappear
  width: number; // px, múltiplo de 50
  kind: "car" | "truck" | "log-short" | "log-long" | "turtle";
  sinking?: boolean;
  sinkTimer?: number;
}

interface GoalSlot {
  col: number; // columna izquierda del hueco (2 celdas de ancho)
  filled: boolean;
}

interface Frog {
  col: number; // 0-15, derivado de x
  row: number; // 0-11
  x: number; // px, posición continua (permite arrastre sobre troncos/tortugas)
  ridingObstacle: Obstacle | null;
}

export function createRanariaGame(
  canvas: HTMLCanvasElement,
  callbacks: RanariaGameCallbacks
): RanariaGameHandle {
  const ctx = canvas.getContext("2d")!;

  // ── Grilla ────────────────────────────────────────────────────────────
  const COLS = 16;
  const ROWS = 12;
  const CELL = 50;
  const W = COLS * CELL; // 800

  const GOAL_ROW = 0;
  const RIVER_ROWS = [1, 2, 3, 4, 5];
  const SAFE_ROW = 6;
  const ROAD_ROWS = [7, 8, 9, 10, 11];
  const SPAWN_ROW = 11;
  const SPAWN_COL = 7;
  const GOAL_COLS = [1, 4, 7, 10, 13];

  const LIFE_TIME = 25;
  const DEAD_TIMER = 1;
  const LEVEL_SPEED_MULT = 1.15;
  const TURTLE_CYCLE = 6;
  const TURTLE_FLOAT_PHASE = 4;

  // ── Colores (sin skins todavía — literales directos) ────────────────────
  const COLORS = {
    goalBg: "#0b3d2e",
    goalPadEmpty: "#123",
    goalPadFilled: "#2ecc71",
    riverBg: "#0d3b66",
    safeBg: "#1a5c2a",
    roadBg: "#222",
    laneStripe: "rgba(255,255,255,0.15)",
    car: "#e63946",
    truck: "#f4a261",
    logShort: "#7a4a24",
    logLong: "#8a5a30",
    turtleFloat: "#2ecc71",
    turtleSink: "rgba(46,204,113,0.35)",
    frog: "#9dff5c",
    hudText: "#fff",
  };

  // ── Input ────────────────────────────────────────────────────────────
  const GAME_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  function onKeyDown(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (e.repeat) return;
    if (state !== "playing") return;
    switch (e.code) {
      case "ArrowUp":
        tryMove(0, -1);
        break;
      case "ArrowDown":
        tryMove(0, 1);
        break;
      case "ArrowLeft":
        tryMove(-1, 0);
        break;
      case "ArrowRight":
        tryMove(1, 0);
        break;
    }
  }

  // ── Utils ────────────────────────────────────────────────────────────
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  // ── Estado del juego ─────────────────────────────────────────────────
  let lanes: Lane[] = [];
  let goalSlots: GoalSlot[] = [];
  let frog: Frog = { col: SPAWN_COL, row: SPAWN_ROW, x: SPAWN_COL * CELL, ridingObstacle: null };
  let minRowReached = SPAWN_ROW;
  let lifeTimer = LIFE_TIME;
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: RanariaState["status"] = "playing";
  let deadTimer = 0;
  // Congela peligro/timer hasta la primera pulsación de flecha de la vida:
  // la rana arranca en un punto muerto y el jugador decide cuándo salir.
  let ready = false;

  interface LaneConfig {
    kind: "river" | "road";
    obstacleKind: Obstacle["kind"];
    width: number;
    direction: 1 | -1;
    baseSpeed: number;
    spacing: number;
  }

  const ROAD_CONFIG: LaneConfig[] = [
    { kind: "road", obstacleKind: "car", width: 50, direction: 1, baseSpeed: 90, spacing: 220 },
    { kind: "road", obstacleKind: "truck", width: 100, direction: -1, baseSpeed: 70, spacing: 280 },
    { kind: "road", obstacleKind: "car", width: 50, direction: 1, baseSpeed: 130, spacing: 260 },
    {
      kind: "road",
      obstacleKind: "truck",
      width: 100,
      direction: -1,
      baseSpeed: 100,
      spacing: 320,
    },
    { kind: "road", obstacleKind: "car", width: 50, direction: 1, baseSpeed: 110, spacing: 240 },
  ];

  const RIVER_CONFIG: LaneConfig[] = [
    {
      kind: "river",
      obstacleKind: "log-short",
      width: 100,
      direction: 1,
      baseSpeed: 60,
      spacing: 250,
    },
    {
      kind: "river",
      obstacleKind: "log-long",
      width: 150,
      direction: -1,
      baseSpeed: 45,
      spacing: 300,
    },
    {
      kind: "river",
      obstacleKind: "turtle",
      width: 100,
      direction: 1,
      baseSpeed: 55,
      spacing: 260,
    },
    {
      kind: "river",
      obstacleKind: "log-short",
      width: 100,
      direction: -1,
      baseSpeed: 70,
      spacing: 240,
    },
    {
      kind: "river",
      obstacleKind: "log-long",
      width: 150,
      direction: 1,
      baseSpeed: 50,
      spacing: 320,
    },
  ];

  function buildLane(row: number, laneIndex: number, kind: LaneKind, cfg: LaneConfig): Lane {
    const obstacles: Obstacle[] = [];
    const count = Math.ceil(W / cfg.spacing) + 1;
    const offset = (laneIndex * 37) % cfg.spacing;
    for (let i = 0; i < count; i++) {
      const obstacle: Obstacle = {
        x: i * cfg.spacing + offset,
        width: cfg.width,
        kind: cfg.obstacleKind,
      };
      if (cfg.obstacleKind === "turtle") {
        obstacle.sinkTimer = (i * 1.3) % TURTLE_CYCLE;
        obstacle.sinking = obstacle.sinkTimer >= TURTLE_FLOAT_PHASE;
      }
      obstacles.push(obstacle);
    }
    return { row, kind, direction: cfg.direction, speed: cfg.baseSpeed, obstacles };
  }

  function initLanes() {
    lanes = [
      ...RIVER_ROWS.map((row, i) => buildLane(row, i, "river", RIVER_CONFIG[i])),
      ...ROAD_ROWS.map((row, i) => buildLane(row, i, "road", ROAD_CONFIG[i])),
    ];
  }

  function initGoalSlots() {
    goalSlots = GOAL_COLS.map((col) => ({ col, filled: false }));
  }

  function laneAtRow(row: number): Lane | undefined {
    return lanes.find((l) => l.row === row);
  }

  function respawnFrog() {
    frog = { col: SPAWN_COL, row: SPAWN_ROW, x: SPAWN_COL * CELL, ridingObstacle: null };
    minRowReached = SPAWN_ROW;
    lifeTimer = LIFE_TIME;
    ready = false;
    clearSpawnColumn();
  }

  function clearSpawnColumn() {
    const lane = laneAtRow(SPAWN_ROW);
    if (!lane) return;
    const left = SPAWN_COL * CELL;
    const right = left + CELL;
    for (const o of lane.obstacles) {
      if (o.x + o.width > left && o.x < right) {
        o.x -= lane.direction * (o.width + CELL * 2);
      }
    }
  }

  function killFrog() {
    frog.ridingObstacle = null;
    lives--;
    if (lives <= 0) {
      state = "gameover";
    } else {
      state = "dead";
      deadTimer = DEAD_TIMER;
    }
  }

  function resolveGoalEntry(col: number) {
    const slot = goalSlots.find((s) => col >= s.col && col <= s.col + 1);
    if (!slot || slot.filled) {
      killFrog();
      return;
    }
    slot.filled = true;
    score += 50;
    if (goalSlots.every((s) => s.filled)) {
      levelUp();
    } else {
      respawnFrog();
    }
  }

  function levelUp() {
    level++;
    score += 200;
    goalSlots.forEach((s) => (s.filled = false));
    lanes.forEach((l) => (l.speed *= LEVEL_SPEED_MULT));
    respawnFrog();
  }

  function tryMove(dCol: number, dRow: number) {
    ready = true;
    const currentCol = clamp(Math.round(frog.x / CELL), 0, COLS - 1);
    const newCol = clamp(currentCol + dCol, 0, COLS - 1);
    const newRow = clamp(frog.row + dRow, 0, ROWS - 1);

    if (newRow === GOAL_ROW && dRow === -1) {
      resolveGoalEntry(newCol);
      return;
    }

    frog.row = newRow;
    frog.x = newCol * CELL;
    frog.col = newCol;
    frog.ridingObstacle = null;

    if (newRow < minRowReached) {
      score += 10 * (minRowReached - newRow);
      minRowReached = newRow;
    }
  }

  let lastNotified: RanariaState | null = null;

  function notifyState() {
    if (
      lastNotified &&
      lastNotified.score === score &&
      lastNotified.lives === lives &&
      lastNotified.level === level &&
      lastNotified.status === state
    ) {
      return;
    }
    lastNotified = { score, lives, level, status: state };
    callbacks.onStateChange(lastNotified);
  }

  // ── Update ───────────────────────────────────────────────────────────
  function updateLanes(dt: number) {
    for (const lane of lanes) {
      for (const o of lane.obstacles) {
        o.x += lane.direction * lane.speed * dt;
        if (lane.direction === 1 && o.x > W) {
          o.x = -o.width;
        } else if (lane.direction === -1 && o.x + o.width < 0) {
          o.x = W;
        }
        if (o.kind === "turtle") {
          o.sinkTimer = ((o.sinkTimer ?? 0) + dt) % TURTLE_CYCLE;
          o.sinking = o.sinkTimer >= TURTLE_FLOAT_PHASE;
        }
      }
    }
  }

  function obstacleUnderFrog(lane: Lane): Obstacle | null {
    const cx = frog.x + CELL / 2;
    for (const o of lane.obstacles) {
      if (cx >= o.x && cx <= o.x + o.width) return o;
    }
    return null;
  }

  function updateRiver(lane: Lane, dt: number) {
    const riding = obstacleUnderFrog(lane);
    if (!riding || (riding.kind === "turtle" && riding.sinking)) {
      killFrog();
      return;
    }
    frog.ridingObstacle = riding;
    frog.x += lane.direction * lane.speed * dt;
    frog.col = clamp(Math.round(frog.x / CELL), 0, COLS - 1);
    if (frog.x + CELL < 0 || frog.x > W) {
      killFrog();
    }
  }

  function updateRoad(lane: Lane) {
    const left = frog.x;
    const right = frog.x + CELL;
    for (const o of lane.obstacles) {
      if (o.x < right && o.x + o.width > left) {
        killFrog();
        return;
      }
    }
  }

  function update(dt: number) {
    if (state === "gameover") {
      notifyState();
      return;
    }

    if (state === "dead") {
      updateLanes(dt);
      deadTimer -= dt;
      if (deadTimer <= 0) {
        respawnFrog();
        state = "playing";
      }
      notifyState();
      return;
    }

    if (!ready) {
      updateLanes(dt);
      notifyState();
      return;
    }

    lifeTimer -= dt;
    if (lifeTimer <= 0) {
      killFrog();
      notifyState();
      return;
    }

    updateLanes(dt);

    const lane = laneAtRow(frog.row);
    if (lane?.kind === "river") {
      updateRiver(lane, dt);
    } else if (lane?.kind === "road") {
      frog.ridingObstacle = null;
      updateRoad(lane);
    } else {
      frog.ridingObstacle = null;
    }

    notifyState();
  }

  // ── Draw ─────────────────────────────────────────────────────────────
  function rowBackground(row: number): string {
    if (row === GOAL_ROW) return COLORS.goalBg;
    if (RIVER_ROWS.includes(row)) return COLORS.riverBg;
    if (row === SAFE_ROW) return COLORS.safeBg;
    return COLORS.roadBg;
  }

  function drawBoard() {
    for (let row = 0; row < ROWS; row++) {
      ctx.fillStyle = rowBackground(row);
      ctx.fillRect(0, row * CELL, W, CELL);
    }
    // Franjas de carril sobre carretera para dar sensación de movimiento.
    ctx.strokeStyle = COLORS.laneStripe;
    ctx.setLineDash([16, 12]);
    for (const row of ROAD_ROWS) {
      ctx.beginPath();
      ctx.moveTo(0, row * CELL + CELL / 2);
      ctx.lineTo(W, row * CELL + CELL / 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawGoalSlots() {
    for (const slot of goalSlots) {
      const x = slot.col * CELL;
      const y = GOAL_ROW * CELL;
      ctx.fillStyle = slot.filled ? COLORS.goalPadFilled : COLORS.goalPadEmpty;
      ctx.fillRect(x + 4, y + 4, CELL * 2 - 8, CELL - 8);
    }
  }

  function drawObstacle(o: Obstacle, row: number) {
    const y = row * CELL;
    if (o.kind === "turtle") {
      ctx.fillStyle = o.sinking ? COLORS.turtleSink : COLORS.turtleFloat;
    } else if (o.kind === "car") {
      ctx.fillStyle = COLORS.car;
    } else if (o.kind === "truck") {
      ctx.fillStyle = COLORS.truck;
    } else {
      ctx.fillStyle = o.kind === "log-long" ? COLORS.logLong : COLORS.logShort;
    }
    ctx.fillRect(o.x + 2, y + 6, o.width - 4, CELL - 12);
  }

  function drawLanes() {
    for (const lane of lanes) {
      for (const o of lane.obstacles) {
        drawObstacle(o, lane.row);
      }
    }
  }

  function drawFrog() {
    if (state === "gameover") return;
    if (state === "dead" && Math.floor(deadTimer * 10) % 2 === 0) return;
    ctx.fillStyle = COLORS.frog;
    ctx.fillRect(frog.x + 6, frog.row * CELL + 6, CELL - 12, CELL - 12);
  }

  function drawHUD() {
    ctx.fillStyle = COLORS.hudText;
    ctx.font = "14px monospace";
    ctx.textAlign = "right";
    const pct = clamp(lifeTimer / LIFE_TIME, 0, 1);
    const barW = 120;
    ctx.fillText(`${Math.max(0, lifeTimer).toFixed(1)}s`, W - 14, 22);
    ctx.strokeStyle = COLORS.hudText;
    ctx.strokeRect(W - 14 - barW, 28, barW, 6);
    ctx.fillStyle = pct < 0.25 ? COLORS.car : COLORS.turtleFloat;
    ctx.fillRect(W - 14 - barW, 28, barW * pct, 6);
  }

  function draw() {
    drawBoard();
    drawGoalSlots();
    drawLanes();
    drawFrog();
    drawHUD();
  }

  // ── Loop principal ──────────────────────────────────────────────────
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

  function initGame() {
    initLanes();
    initGoalSlots();
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    respawnFrog();
  }

  function start() {
    initGame();
    notifyState();
    window.addEventListener("keydown", onKeyDown);
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
  }

  return { start, pause, resume, stop };
}
