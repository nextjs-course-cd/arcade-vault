# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

Arcade Vault — plataforma para jugar juegos arcade online y competir por puntos. Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase. Todo el texto de UI, comentarios y specs va **en español**.

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción (verificación principal — no hay test runner)
npm run start      # servir el build
npm run lint       # eslint (flat config, next/core-web-vitals + next/typescript + prettier)
npm run lint:fix
npm run format     # prettier --write .
```

No hay test runner configurado. La verificación de una feature es `npm run build` + prueba manual en el navegador.

Un hook `PostToolUse` (`.claude/hooks/format-file.sh`) ejecuta prettier + `eslint --fix` sobre cada archivo tocado con Write/Edit — no hace falta formatear a mano.

## Arquitectura

### Datos (Supabase)

Dos tablas: `games` (catálogo: `id`, `title`, `short`, `long`, `cat`, `cover`, `color`) y `scores` (`game_id`, `user_id`, `name`, `score`, `created_at`).

- `lib/supabase/server.ts` — cliente SSR con cookies, para Server Components y Server Actions.
- `lib/supabase/client.ts` — cliente de navegador, solo para componentes cliente (ej. `YourBestScore`).
- `lib/games.ts` — `getGames()` / `getGameById()`; combinan la fila del catálogo con estadísticas derivadas de `scores` (`best`, `plays`) en `GameWithStats`. Las estadísticas **no** se guardan, se calculan.
- `lib/scores.ts` — `getTopScores(gameId, limit)` para leaderboards.
- `lib/actions/scores.ts` — Server Action `saveScore()`, único camino de escritura.

Variables de entorno en `.env.local` (plantilla en `.env.template`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

El MCP server `supabase` está configurado en `.mcp.json` (proyecto remoto) — úsalo para inspeccionar esquema y sembrar filas del catálogo.

### Auth

`lib/auth.tsx` — `AuthProvider` cliente con estado en `localStorage` (`av_user`), solo un nombre de jugador en mayúsculas (máx. 10 chars). **No** es auth de Supabase; `scores.user_id` se inserta como `null`. Envuelve toda la app desde `app/layout.tsx`.

### Rutas

- `/` home (`HomeContent`), `/juegos` catálogo (`GamesBrowser` + `GameCard`), `/juego/[id]` detalle + leaderboard, `/juego/[id]/jugar` reproductor, `/salon` salón de la fama, `/acerca-de`, `/auth`.
- Las páginas son Server Components async que hacen fetch de Supabase; los componentes interactivos en `components/` son `"use client"`.
- `lib/categories.ts` — `CATS`/`Cat`, fuente única de las categorías del catálogo (usado por el filtro de `/juegos` y por los specs de juego nuevo).

### Motores de juego (lo importante)

Contrato compartido en `lib/games/types.ts`: `ArcadeGameState` (`score`/`lives`/`level`/`status`), `ArcadeGameOptions` (`skin` inicial), `ArcadeGameHandle` (`start`/`pause`/`resume`/`stop`, más `setSkin?` para cambio de skin en caliente), `ArcadeGameProps` (props que React pasa al componente canvas, incluye `skin`).

Cada juego real tiene tres piezas:

1. `lib/games/<id>/engine.ts` — motor del juego (portado de `references/started-games/` o escrito desde cero por el agente `game-jam`). **Todo el estado vive dentro de la closure** que devuelve `create<Nombre>Game(canvas, callbacks, options)`; nada de globals de módulo, para que React Strict Mode pueda montar/desmontar sin colisiones.
2. `components/games/<Nombre>Game.tsx` — componente `"use client"` que crea el canvas 800×600 (escalado por `devicePixelRatio`), instancia el motor y traduce `onStateChange` a los callbacks de props.
3. Una línea en `lib/games/registry.ts` mapeando el id de catálogo al componente vía `memo(dynamic(..., { ssr: false }))` — el `memo` evita que `GamePlayer.tsx` reinstancie el canvas en cada render del contenedor (spec 11, performance).

`components/GamePlayer.tsx` resuelve el juego con `getGameComponent(id)` — **nunca ramifiques con `if (game.id === "...")`**. Si el id no está en el registry, cae al placeholder animado con score simulado. El HUD (puntuación/vidas/nivel), la pausa y el modal de fin de juego con guardado son de React; los overlays equivalentes del juego original se eliminan al portar.

Juegos implementados: `asteroids`, `caida` (Tetris) y `bloque-buster` (Arkanoid) — ports de `references/started-games/` (ya agotado); `ranaria` — primer juego con motor desde cero, generado por el agente `game-jam`. Assets binarios en `public/games/<id>/`.

### Skins

Tres skins globales (`clasico`/`neon`/`retro`, `lib/games/skins.ts`), una sola preferencia por usuario en `localStorage` (`av_skin`), no por juego. Cada juego define su paleta en `lib/games/<id>/skins.ts`; el motor la recibe vía `ArcadeGameOptions.skin` y la mantiene en la closure (nunca en módulo), y expone `setSkin()` para cambiarla sin reiniciar la partida. Selector en el HUD de `/juego/:id/jugar` (`.hud-stat.skin` en `GamePlayer.tsx`). `ranaria` todavía no tiene las tres skins implementadas (colores literales en el engine).

### Controles táctiles

`lib/games/touchControls.ts` mapea id de catálogo → controles (D-pad + hasta 2 botones) a `KeyboardEvent.code`; `components/TouchControls.tsx` renderiza un gamepad neón que despacha esos `keydown`/`keyup` a `window` — los engines no se tocan, ya escuchan teclado. Se muestra en `GamePlayer.tsx` solo si `isReal && isTouchDevice`. `ranaria` aún no tiene entrada en el mapa.

### Estilos

`app/globals.css` (~3000 líneas) — sistema retro CRT/neón hecho a mano con variables CSS (`--cyan`, `--magenta`, `--ink`, `--line`…) y clases semánticas (`.crt`, `.btn`, `.pixel`, `.neon-cyan`, `.av-player`). Tailwind v4 está disponible pero el grueso del diseño usa estas clases; sigue el sistema existente antes de introducir utilidades nuevas. Fuentes: `Press Start 2P` (pixel) y `JetBrains Mono`, cargadas en el layout.

`references/templates/` contiene el mockup HTML/JSX original del que salió el diseño — consúltalo para pantallas aún no implementadas. `references/implemented-games.md` es el inventario del catálogo con su estado de implementación; `references/game-suggestions-todo.md` es el backlog del agente `game-planner`; `references/gamepad-assets/` es la referencia visual del D-pad táctil (spec 10).

## Workflow spec-driven

Todo cambio de funcionalidad pasa primero por un spec en `specs/NN-slug.md` (numerados, en español, con estado `Draft` → `Approved` → `Done`). Config en `specs/.spec-config.yml` (`AutoCreateBranch: true` — `/spec-impl` crea la rama `spec-NN-slug` sola).

Skills del repo (en `.claude/skills/`, espejados en `.agents/skills/`):

- `/spec` — escribir un spec nuevo.
- `/spec-impl` — implementar un spec aprobado.
- `/spec-impl-game` — igual que `/spec-impl`, pero al terminar el plan encadena `skin-designer` y luego `mobile-porter` (secuencial, nunca en paralelo) sobre el juego recién portado; úsalo en vez de `/spec-impl` cuando el spec sea un port de juego.
- `/port-game` — portar un juego vanilla de `references/started-games/` a la plataforma. Escribe primero el spec del port y solo implementa tras aprobación explícita. Su `reference.md` es el playbook técnico del port (contratos, esqueletos, trampas ya resueltas) — léelo completo, no de memoria.

Nunca marques un spec como `Approved` o `Done` por tu cuenta.

## Skills

- Usa siempre `/frontend-design` al generar interfaces de usuario.

## Agentes

Definición completa de cada uno en su archivo (`.claude/agents/<nombre>.md`); aquí solo qué hace y cuándo usarlo.

- `game-planner` — propone qué juego portar/crear después; lleva el backlog en `references/game-suggestions-todo.md`. No escribe specs ni código.
- `game-jam` — dado un tema, genera de forma autónoma el spec completo (`Draft`) de un juego arcade nuevo con motor desde cero en `specs/game-jam/<game-name>/01-<slug>.md`.
- `skin-designer` — implementa las tres skins (clásico/neón/retro) de un juego ya portado que aún no las tenga.
- `mobile-porter` — audita e implementa el responsive móvil (solo web) de una ruta o de toda la app.
