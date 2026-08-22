# Referencia técnica del port (leer en Fase 0)

Este documento es el playbook técnico exacto extraído de los specs 05 y 06 (Asteroids), ya implementado en el repo. Un port nuevo debe reproducir el mismo contrato, no inventar uno propio.

## Contratos genéricos (`lib/games/types.ts`)

```ts
export interface ArcadeGameState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}
export interface ArcadeGameCallbacks {
  onStateChange(state: ArcadeGameState): void;
}
export interface ArcadeGameHandle {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
}
export interface ArcadeGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: () => void;
}
```

Si `lib/games/types.ts` no existe todavía en el repo, créalo primero (esto solo pasa la primera vez que se corre el skill). `lib/games/asteroids/engine.ts` ya reexporta sus tipos como alias de estos (`export type AsteroidsState = ArcadeGameState`, etc.) — sigue ese mismo patrón para el juego nuevo.

## Esqueleto del motor (`lib/games/<id>/engine.ts`)

```ts
import type { ArcadeGameState, ArcadeGameCallbacks, ArcadeGameHandle } from "@/lib/games/types";

export function create<Nombre>Game(
  canvas: HTMLCanvasElement,
  callbacks: ArcadeGameCallbacks
): ArcadeGameHandle {
  const ctx = canvas.getContext("2d")!;
  const W = <ancho interno fijo>;
  const H = <alto interno fijo>;

  // Input: SIEMPRE dentro de la closure, nunca en globals de módulo.
  const keys: Record<string, boolean> = {};
  function onKeyDown(e: KeyboardEvent) { /* preventDefault solo en teclas del juego */ }
  function onKeyUp(e: KeyboardEvent) { keys[e.code] = false; }

  // Todo lo que en el original era `let`/`const` a nivel de módulo pasa aquí
  // adentro: piezas, entidades, score, lives, level, state...
  let score = 0, lives = 3, level = 1;
  let state: ArcadeGameState["status"] = "playing";

  function notifyState() {
    callbacks.onStateChange({ score, lives, level, status: state });
  }

  function update(dt: number) { /* ...; notifyState() en cada cambio relevante */ }
  function draw() { /* HUD interno del canvas: se conserva tal cual el original */ }

  let running = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05); // clamp dt
    lastTime = ts;
    update(dt);
    draw();
    if (running) rafId = requestAnimationFrame(loop);
  }

  function start() {
    /* reset de estado inicial */
    notifyState();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }
  function pause() {
    running = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }
  function resume() {
    if (running) return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    pause();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  }

  return { start, pause, resume, stop };
}
```

**Reglas duras, no negociables:**

- Cero globals de módulo. Todo vive en la closure de la factory (React Strict Mode monta efectos dos veces en desarrollo; dos instancias con globals compartidos colisionan).
- Listeners de teclado se registran en `start()` y se remueven en `stop()`. `pause()`/`resume()` solo tocan el loop `requestAnimationFrame`, nunca los listeners.
- `lastTime = null` al hacer `start()`/`resume()` para que el primer frame tenga `dt = 0` (evita saltos tras una pausa).
- `dt` siempre clamp (`Math.min(dt, 0.05)`) para que un tab en background no rompa la física al volver.
- El HUD dibujado dentro del canvas (score/nivel/vidas del juego original) **se conserva** — coexiste con el HUD de React, no se borra.
- El overlay interno de "GAME OVER" + reinicio automático por tecla **se elimina** — el modal de React ya maneja el fin de partida. `killShip`/equivalente solo actualiza estado y notifica, no reinicia solo.
- `notifyState()` se llama en cada cambio de score/vidas/nivel/estado, no solo al final.
- Juegos sin concepto de "vidas" (p. ej. Tetris) deben decidir un mapeo explícito: usar `lives` fijo en un valor testigo (p. ej. `1`, ocultando el HUD de vidas) o mapear "line-out"/game over a `lives: 0`. Pregúntalo en Fase 1, no lo asumas.
- Juegos con imágenes/audio como asset externo (`loadSpritesheet(cb)`, `new Audio(...)`) requieren manejar la carga como parte de `start()` (asíncrona) antes de arrancar el loop; decide en Fase 1 si el sonido entra en alcance (spec 05 lo dejó fuera explícitamente para Asteroids).

## Esqueleto del componente (`components/games/<Nombre>Game.tsx`)

```tsx
"use client";

import { useEffect, useRef } from "react";
import { create<Nombre>Game, type <Nombre>GameHandle } from "@/lib/games/<id>/engine";
import type { ArcadeGameProps } from "@/lib/games/types";

const INTERNAL_WIDTH = <W>;
const INTERNAL_HEIGHT = <H>;

export default function <Nombre>Game({
  paused, onScoreChange, onLivesChange, onLevelChange, onGameOver,
}: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<<Nombre>GameHandle | null>(null);
  const callbacksRef = useRef({ onScoreChange, onLivesChange, onLevelChange, onGameOver });
  const lastStatusRef = useRef<"playing" | "dead" | "gameover">("playing");

  useEffect(() => {
    callbacksRef.current = { onScoreChange, onLivesChange, onLevelChange, onGameOver };
  }, [onScoreChange, onLivesChange, onLevelChange, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = INTERNAL_WIDTH * dpr;
    canvas.height = INTERNAL_HEIGHT * dpr;
    canvas.getContext("2d")?.scale(dpr, dpr);

    lastStatusRef.current = "playing";
    const handle = create<Nombre>Game(canvas, {
      onStateChange(state) {
        callbacksRef.current.onScoreChange(state.score);
        callbacksRef.current.onLivesChange(state.lives);
        callbacksRef.current.onLevelChange(state.level);
        if (state.status === "gameover" && lastStatusRef.current !== "gameover") {
          callbacksRef.current.onGameOver();
        }
        lastStatusRef.current = state.status;
      },
    });
    handleRef.current = handle;
    handle.start();

    return () => { handle.stop(); handleRef.current = null; };
  }, []);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    paused ? handle.pause() : handle.resume();
  }, [paused]);

  return (
    <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
  );
}
```

`.crt-screen` (contenedor real, ver `app/globals.css`) ya es `position: relative; aspect-ratio: 4/3; overflow: hidden`. Si el juego original no es 4:3 (p. ej. Tetris es más alto que ancho — tablero 300×600), decide en Fase 1: letterbox dentro de la resolución interna 800×600 (dibujando el tablero centrado con márgenes) en vez de cambiar el aspect-ratio del contenedor compartido por todos los juegos.

## Registro (`lib/games/registry.ts`)

Una línea por juego:

```ts
const registry: Record<string, ComponentType<ArcadeGameProps>> = {
  asteroids: dynamic(() => import("@/components/games/AsteroidGame"), { ssr: false }),
  <id>: dynamic(() => import("@/components/games/<Nombre>Game"), { ssr: false }),
};
```

`ssr: false` es obligatorio: el motor toca `window`/`canvas.getContext` que no existen en el servidor.

## `components/GamePlayer.tsx`

Ya usa `getGameComponent(game.id)` de `lib/games/registry.ts` — un juego nuevo con motor real solo necesita aparecer en el registry, no requiere tocar `GamePlayer.tsx`. No dupliques el `if (game.id === ...)` que existía antes del refactor.

## Catálogo (`games` en Supabase)

Antes de insertar nada, comprobar con `mcp__supabase__execute_sql` (`select id, title, cat, cover, color from games`) si el id de destino ya existe. **Los 8 ids del catálogo ya están sembrados** (spec 06); para los juegos de referencia típicos el id de catálogo ya existe y no hace falta insertar fila nueva:

| carpeta en `references/started-games/` | id de catálogo existente | title         | cat     | cover        | color   |
| -------------------------------------- | ------------------------ | ------------- | ------- | ------------ | ------- |
| `02-asteroids`                         | `asteroids`              | ROCAS         | SHOOTER | cover-rocas  | yellow  |
| `03-tetris`                            | `caida`                  | CAÍDA         | PUZZLE  | cover-tetro  | magenta |
| `04-arkanoid`                          | `bloque-buster`          | BLOQUE BUSTER | ARCADE  | cover-bricks | cyan    |

Si el juego a portar no corresponde a ninguno de los 8 ids existentes, confirma con el usuario el id/título/categoría/color/cover en Fase 1 y usa `mcp__supabase__apply_migration` con un `INSERT INTO games (...)` respetando los `CHECK` de `cat` (`ARCADE|PUZZLE|SHOOTER|VERSUS`) y `color` (`cyan|magenta|green|yellow`). Nunca insertes si el id ya existe (evita duplicar la fila).

## Assets binarios

Si el juego trae imágenes/sonidos (p. ej. `04-arkanoid/assets/`), cópialos a `public/games/<id>/...` y referencia rutas absolutas `/games/<id>/...` desde el motor — nunca rutas relativas al `index.html` original.

## Trampas ya pagadas (no las redescubras)

- `next/dynamic({ ssr: false })` es obligatorio para el componente del juego — sin esto, `next build` falla al intentar prerenderizar acceso a `window`/`canvas` en servidor.
- El `setInterval` de puntaje falso en `GamePlayer.tsx` se salta automáticamente para cualquier id presente en el registry (`isReal = Boolean(GameComponent)`) — no hace falta tocar esa lógica.
- El botón `FIN` fuerza `over = true` en React sin llamar a ningún método del motor; el motor se pausa solo porque recibe `paused={paused || over}`. No agregues un método `forceGameOver()` al handle — no hace falta.
- `JUGAR DE NUEVO` no reinicia el motor desde adentro: `GamePlayer` cambia `key={instanceKey}`, lo que desmonta y vuelve a montar el componente del canvas, creando una instancia nueva del motor. No implementes un método `restart()` en el handle.
- No copiar `index.html`/`README.md`/`CLAUDE.md`/`.gitignore`/workflows del juego de referencia — solo la lógica de `game.js` (y sus assets si aplica).
