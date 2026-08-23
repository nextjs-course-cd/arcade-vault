# 08 — BLOQUE BUSTER: Arkanoid real

**Estado:** Approved
**Depende de:** SPEC 05, SPEC 06
**Fecha:** 2026-08-22

**Objetivo:** Portar el clon de Arkanoid de `references/started-games/04-arkanoid/` a TypeScript e integrarlo como el juego jugable real detrás del id `bloque-buster` en el catálogo, con motor, HUD, pausa, fin de partida y guardado real de puntuación en Supabase.

## Alcance

**Incluye:**

- Portar `game.js` + `levels.js` (5 niveles con patrones de bloques y multiplicador de velocidad) + `assets/spritesheet.js` a `lib/games/bloque-buster/engine.ts`, sin globals de módulo: factory `createBloqueBusterGame(canvas, callbacks)` que devuelve `{ start, pause, resume, stop }` (`ArcadeGameHandle`).
- Mantener el HUD dibujado internamente en el canvas (Score, Nivel, vidas como bolitas) tal cual el original — coexiste con el HUD de React.
- Eliminar el overlay interno de `GAME OVER` (`drawOverlay('GAME OVER')`).
- Mapear el estado `win` (ganar los 5 niveles) al mismo flujo que game over: `status: "gameover"` dispara `onGameOver()` igual que agotar las 3 vidas. Se elimina también `drawOverlay('¡Completaste el juego!')`.
- Eliminar el overlay interno de PAUSA (`drawPauseOverlay`) y su listener `click` de selección de nivel (`PAUSE_BTN_*`, rama `if (!isPaused) return` del handler `click`). La pausa la controla exclusivamente React vía `pause()`/`resume()` del handle.
- Conservar el control por teclado (`ArrowLeft`/`ArrowRight` mueven la paleta) **y** por mouse (`mousemove` sobre el canvas mueve la paleta, con el mismo cálculo de escala `scaleX` del original). Sin soporte táctil.
- Portar el spritesheet (`assets/spritesheet-breakout.png`) y los 2 sonidos (`ball-bounce.mp3`, `break-sound.mp3`) a `public/games/bloque-buster/`, referenciados con rutas absolutas `/games/bloque-buster/...`. Carga del spritesheet asíncrona antes de arrancar el loop en `start()`; los sonidos se reproducen igual que el original (`new Audio(...).cloneNode().play()` por evento, sin precarga bloqueante).
- Mapeo directo sin transformaciones: `score`/`lives`/`level` del motor original pasan tal cual a `ArcadeGameState` (`lives` inicia en 3, `level` = `currentLevel` 1-5).
- Crear `components/games/BloqueBusterGame.tsx` (Client Component), resolución interna fija 800×600 (ya 4:3, igual que Asteroids), escalado responsive dentro de `.crt-screen`, tipado con `ArcadeGameProps`.
- Registrar `bloque-buster` en `lib/games/registry.ts` (`ssr: false`).
- Reusar `saveScore` y el modal de fin de partida existentes en `components/GamePlayer.tsx` sin modificarlos.
- Confirmar que la fila `bloque-buster` ya existe en `games` (Supabase) — no se inserta nada nuevo.
- Verificación: `npm run build` sin errores, prueba manual de una partida completa en `/juego/bloque-buster/jugar`.

**No incluye (fuera de este spec):**

- Controles táctiles.
- Cambiar el mock de los demás juegos sin motor real (`caida` ya tiene motor real; `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel` siguen con el mock).
- Un motor de juegos "genérico" más allá de las interfaces ya compartidas en `lib/games/types.ts`.
- Copiar `index.html`/`README.md`/`CLAUDE.md`/`.gitignore`/`skills-lock.json`/`.agents/` del juego de referencia.
- Selector de nivel manual (el overlay de pausa que lo ofrecía se elimina; los niveles se avanzan solo automáticamente al limpiar el tablero).

## Modelo de datos

Este spec no introduce persistencia nueva: reutiliza `scores`/`games` en Supabase (spec 06) y `saveScore` (`lib/actions/scores.ts`). La fila `bloque-buster` (`title: BLOQUE BUSTER`, `cat: ARCADE`, `cover: cover-bricks`, `color: cyan`) ya existe — confirmado con `select id, title, cat, cover, color from games`.

Reutiliza los tipos de `lib/games/types.ts` (`ArcadeGameState`, `ArcadeGameCallbacks`, `ArcadeGameHandle`, `ArcadeGameProps`) sin extenderlos — `score`/`lives`/`level`/`status` calzan 1:1 con el original.

## Plan de implementación

1. **Assets.** Copiar `assets/spritesheet-breakout.png`, `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3` a `public/games/bloque-buster/`.
2. **Portar el motor.** Crear `lib/games/bloque-buster/engine.ts`: dentro de la closure de `createBloqueBusterGame`, portar `LEVELS` (de `levels.js`), `SPRITES`/`EXPLOSION_FRAMES`/`loadSpritesheet`/`drawSprite`/`drawFrame` (de `spritesheet.js`, adaptado a rutas `/games/bloque-buster/...` y sin `document.createElement` de módulo — se crea dentro de la factory), y la lógica de `game.js` (paddle, ball, blocks, explosions, `update`, `draw`, `loadLevel`, `collideAABB`). Se elimina `drawOverlay`, `drawPauseOverlay`, `PAUSE_BTN_*` y el listener `click`. `gameState 'win'` se traduce a `status: "gameover"` en `notifyState()`. Listeners de teclado (`keydown`/`keyup`) y de mouse (`mousemove`) se registran en `start()` y se remueven en `stop()`. `start()` carga el spritesheet de forma asíncrona (`loadSpritesheet(() => { ...arrancar loop... })`) antes del primer `requestAnimationFrame`.
3. **Componente canvas.** Crear `components/games/BloqueBusterGame.tsx` siguiendo el esqueleto de `reference.md`: resolución interna 800×600, `devicePixelRatio`, instancia el motor en `useEffect`, `stop()` en cleanup, traduce `onStateChange` a las props, reacciona a `paused` con `pause()`/`resume()`.
4. **Registro.** Agregar `bloque-buster: dynamic(() => import("@/components/games/BloqueBusterGame"), { ssr: false })` en `lib/games/registry.ts`.
5. **Verificación final.** `npm run build` sin errores de TypeScript/ESLint. Prueba manual en `/juego/bloque-buster/jugar`: mover paleta con teclado y mouse, rebote de pelota en paredes/paleta, romper bloques con animación de explosión y sonido, avanzar de nivel 1 a 5 automáticamente al limpiar el tablero, perder vidas, pausa/reanudar vía botón React (sin overlay ni click interno), botón FIN, modal de fin de partida con guardado de puntuación real vía `saveScore`, "JUGAR DE NUEVO".

## Criterios de aceptación

- [ ] Existe `lib/games/bloque-buster/engine.ts` con la lógica portada (factory `createBloqueBusterGame`), sin errores de tipos, sin globals de módulo.
- [ ] Existe `components/games/BloqueBusterGame.tsx`, tipado con `ArcadeGameProps`, que monta el canvas 800×600 escalado responsive.
- [ ] `bloque-buster` está registrado en `lib/games/registry.ts` con `ssr: false`.
- [ ] En `/juego/bloque-buster/jugar` se ve el juego real (paleta, pelota, bloques de colores, explosiones animadas) en vez del mock decorativo.
- [ ] El HUD superior de React (Puntuación, Vidas, Nivel) refleja el estado real del motor.
- [ ] El canvas sigue dibujando su propio HUD (Score/Nivel/bolitas de vidas), en paralelo al de React.
- [ ] No aparece ningún overlay interno de "GAME OVER", "¡Completaste el juego!" ni de PAUSA con selector de nivel — solo el modal de React.
- [ ] La paleta se mueve con `ArrowLeft`/`ArrowRight` y con el mouse sobre el canvas.
- [ ] Los bloques se destruyen al impacto, con animación de explosión (4 frames) y sonido `break-sound.mp3`; los rebotes reproducen `ball-bounce.mp3`.
- [ ] Al limpiar el tablero de un nivel, se avanza automáticamente al siguiente (1→5); al limpiar el nivel 5, se dispara game over (modal de React), no un overlay de victoria.
- [ ] Perder las 3 vidas abre el mismo modal existente, permite ingresar iniciales y guarda el puntaje vía `saveScore`.
- [ ] El botón PAUSA detiene el loop (nada se mueve) y REANUDAR lo continúa, sin overlay ni click propios.
- [ ] El botón FIN termina la partida inmediatamente y abre el modal de puntuación final.
- [ ] "JUGAR DE NUEVO" reinicia el juego desde cero (score 0, 3 vidas, nivel 1, tablero completo).
- [ ] `npm run build` termina sin errores de TypeScript ni ESLint.

## Decisiones tomadas y descartadas

- **Id de catálogo `bloque-buster`** — ya sembrado en Supabase (spec 06) con título/categoría/color/cover correctos; no se inserta fila nueva. Confirmado por el usuario.
- **`win` (ganar los 5 niveles) se mapea a `status: "gameover"`** — se descarta un tercer estado `"win"` en `ArcadeGameState` (el contrato genérico de `lib/games/types.ts` no lo tiene y no se justifica extenderlo); ganar dispara el mismo `onGameOver()` que perder, y el modal de React captura el puntaje final igual en ambos casos. Decisión explícita del usuario.
- **Overlay de pausa con selector de nivel se elimina, no se conserva** — duplicaría/conflictuaría con el botón PAUSA/REANUDAR de React (mismo criterio que spec 05 con el overlay de game over); se pierde la función de "saltar a nivel N" del original, aceptado como reducción de alcance.
- **Controles teclado + mouse (a diferencia de spec 05, que fue solo teclado)** — decisión explícita del usuario: el control por mouse es nativo del original y no conflictúa con nada de la integración React: se conserva.
- **Sonido incluido (a diferencia de spec 05, que lo dejó fuera)** — decisión explícita del usuario. Es el primer juego portado con audio; se reproduce con el mismo patrón del original (`Audio.cloneNode().play()` por evento, sin gestión de volumen/mute nueva).
- **Mapeo score/lives/level directo, sin transformación** — el original ya usa exactamente esos tres conceptos con semántica idéntica a `ArcadeGameState`.
- **HUD interno conservado tal cual** — mismo criterio que spec 05.

## Riesgos identificados

- **Carga asíncrona del spritesheet dentro de `start()`.** A diferencia de Asteroids (sin assets externos), el loop no puede arrancar hasta que `loadSpritesheet` resuelva. Mitigación: encapsular la carga dentro de la factory (no en un global de módulo `ssImg`/`ssLoaded` como el original) para que dos instancias (Strict Mode) no compartan la misma imagen cacheada de forma insegura; cada instancia carga su propia imagen (aceptable, es un solo `Image` chico).
- **Rutas de audio/imagen relativas al `index.html` original.** Deben reescribirse a absolutas `/games/bloque-buster/...` en el motor portado; si se olvida alguna, el sprite/sonido falla silenciosamente en el navegador (no rompe build).
