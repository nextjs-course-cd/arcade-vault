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

### Motores de juego (lo importante)

Contrato compartido en `lib/games/types.ts`: `ArcadeGameState` (`score`/`lives`/`level`/`status`), `ArcadeGameHandle` (`start`/`pause`/`resume`/`stop`), `ArcadeGameProps` (props que React pasa al componente canvas).

Cada juego real tiene tres piezas:

1. `lib/games/<id>/engine.ts` — motor vanilla portado. **Todo el estado vive dentro de la closure** que devuelve `create<Nombre>Game(canvas, callbacks)`; nada de globals de módulo, para que React Strict Mode pueda montar/desmontar sin colisiones.
2. `components/games/<Nombre>Game.tsx` — componente `"use client"` que crea el canvas 800×600 (escalado por `devicePixelRatio`), instancia el motor y traduce `onStateChange` a los callbacks de props.
3. Una línea en `lib/games/registry.ts` mapeando el id de catálogo al componente vía `dynamic(..., { ssr: false })`.

`components/GamePlayer.tsx` resuelve el juego con `getGameComponent(id)` — **nunca ramifiques con `if (game.id === "...")`**. Si el id no está en el registry, cae al placeholder animado con score simulado. El HUD (puntuación/vidas/nivel), la pausa y el modal de fin de juego con guardado son de React; los overlays equivalentes del juego original se eliminan al portar.

Juegos portados: `asteroids`, `caida` (Tetris), `bloque-buster` (Arkanoid). Assets binarios en `public/games/<id>/`.

### Estilos

`app/globals.css` (~1300 líneas) — sistema retro CRT/neón hecho a mano con variables CSS (`--cyan`, `--magenta`, `--ink`, `--line`…) y clases semánticas (`.crt`, `.btn`, `.pixel`, `.neon-cyan`, `.av-player`). Tailwind v4 está disponible pero el grueso del diseño usa estas clases; sigue el sistema existente antes de introducir utilidades nuevas. Fuentes: `Press Start 2P` (pixel) y `JetBrains Mono`, cargadas en el layout.

`references/templates/` contiene el mockup HTML/JSX original del que salió el diseño — consúltalo para pantallas aún no implementadas.

## Workflow spec-driven

Todo cambio de funcionalidad pasa primero por un spec en `specs/NN-slug.md` (numerados, en español, con estado `Draft` → `Approved` → `Done`). Config en `specs/.spec-config.yml` (`AutoCreateBranch: true` — `/spec-impl` crea la rama `spec-NN-slug` sola).

Skills del repo (en `.claude/skills/`, espejados en `.agents/skills/`):

- `/spec` — escribir un spec nuevo.
- `/spec-impl` — implementar un spec aprobado.
- `/port-game` — portar un juego vanilla de `references/started-games/` a la plataforma. Escribe primero el spec del port y solo implementa tras aprobación explícita. Su `reference.md` es el playbook técnico del port (contratos, esqueletos, trampas ya resueltas) — léelo completo, no de memoria.

Nunca marques un spec como `Approved` o `Done` por tu cuenta.

## Skills

- Usa siempre `/frontend-design` al generar interfaces de usuario.

## Agentes

- `game-planner` (`.claude/agents/game-planner.md`) — decide qué juego portar después. Evalúa candidatos contra el contrato `ArcadeGameHandle`, diversidad de categorías del catálogo y estética retro CRT/neón. Mantiene memoria persistente de sugerencias, aprobaciones y descartes en `references/game-suggestions-todo.md` — nunca repite una idea ya registrada ahí. No escribe specs ni código; su salida alimenta `/spec` o `/port-game`.
- `game-jam` (`.claude/agents/game-jam.md`) — recibe un tema y genera de forma autónoma un spec completo (`Draft`) de un juego arcade nuevo en `specs/game-jam/<game-name>/01-<slug>.md`, motor desde cero contra `ArcadeGameHandle` (no hay base portable en `references/started-games/`, ya agotada). No pregunta, no toca `references/game-suggestions-todo.md`, no escribe código ni Supabase (solo lectura). El usuario revisa y aprueba antes de `/spec-impl`.
- `skin-designer` (`.claude/agents/skin-designer.md`) — recibe el id de un juego ya implementado, valida si tiene las tres skins (clásico, neón, retro) y, si faltan, las implementa: paleta por juego (`lib/games/<id>/skins.ts`), motor parametrizado (`palette` vive en la closure, nunca en módulo; handle expone `setSkin`) y selector en el HUD de `/juego/:id/jugar`. La infraestructura compartida (`lib/games/skins.ts`, `ArcadeGameOptions` en `lib/games/types.ts`, selector `.hud-stat.skin` en `components/GamePlayer.tsx`, CSS en `app/globals.css`) se crea una sola vez y se reutiliza en corridas siguientes. Motores sprite-based (ej. `bloque-buster`) usan `ctx.filter` sobre un canvas offscreen en vez de reemplazar hex literales. Verifica siempre con `npm run build` + `npm run lint`.
- `mobile-porter` (`.claude/agents/mobile-porter.md`) — audita e implementa el responsive móvil (solo web, sin PWA ni app nativa) de una ruta o de toda la app. Usa `specs/09-controles-tactiles-mobile.md` como referencia de calidad y checklist fijo (viewport, overflow horizontal, `100vh`→`dvh`, targets táctiles ≥44px, `clamp()` para tipografía, padding lateral del bloque 720px). Solo usa breakpoints canónicos (`900px`/`720px`/`520px`, más `840px`/`1100px`/`980px` donde ya existen) dentro de los `@media (max-width: …)` existentes en `app/globals.css` — nunca `min-width`, nunca utilidades Tailwind. Escribe el spec en `specs/NN-slug.md` (`Draft`) y lo implementa. No toca engines de juego, Supabase, ni crea PWA/manifest. Verifica con `npm run build` + `npm run lint`.
