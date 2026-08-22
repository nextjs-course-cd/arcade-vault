# 07 — CAÍDA: Tetris real

**Estado:** Approved
**Depende de:** SPEC 05, SPEC 06
**Fecha:** 2026-08-22

**Objetivo:** Portar el clon de Tetris de `references/started-games/03-tetris/` a TypeScript e integrarlo como el juego jugable real detrás del id `caida` en `app/juego/[id]/jugar/page.tsx`, reemplazando el mock decorativo por el juego funcional con HUD, pausa, fin de partida y guardado de puntuación real en Supabase.

## Alcance

**Incluye:**

- Portar `game.js` (`board`, pieza actual/siguiente, colisión, rotación con wall kicks, línea completada, ghost piece, caída suave/dura, velocidad por nivel) a un módulo TypeScript en `lib/games/caida/engine.ts`, sin globals de módulo: la lógica queda encapsulada en una factory `createCaidaGame(canvas, callbacks)` que implementa `ArcadeGameHandle` (`lib/games/types.ts`), reutilizando el mismo contrato genérico que ya usa `lib/games/asteroids/engine.ts`.
- Resolución interna fija 800×600 (igual que Asteroids), con el tablero (10×20 celdas de 30px = 300×600) dibujado centrado dentro de esa resolución y el panel HUD interno (SCORE/LINES/LEVEL/NEXT con mini-preview de la pieza siguiente) dibujado al costado, todo dentro del propio canvas — sin depender de elementos DOM externos como hacía el original (`#score`, `#lines`, `#level`, `#next-canvas`).
- Mapear el estado del motor a `ArcadeGameState`: `score`/`level` tal cual el original; `lives` fijo en `1` mientras `status === "playing"` y `0` al perder (Tetris no tiene concepto de vidas — un único "game over" quita la vida restante); `status` pasa a `"gameover"` cuando `spawn()` detecta colisión inmediata (igual condición que `endGame()` en el original).
- Crear componente cliente `components/games/CaidaGame.tsx` que monta el `<canvas>`, instancia el motor vía `createCaidaGame`, escala el canvas de forma responsive dentro de `.crt-screen` (mismo patrón dpr/CSS que `AsteroidGame.tsx`), y recibe `ArcadeGameProps` sin definir un tipo de props propio.
- Registrar el juego en `lib/games/registry.ts`: `caida: dynamic(() => import("@/components/games/CaidaGame"), { ssr: false })`. No se toca `components/GamePlayer.tsx` (ya usa `getGameComponent(game.id)` desde el refactor de registry).
- Controles de teclado: `ArrowLeft`/`ArrowRight` mover, `ArrowUp` y `KeyX` rotar (con wall kicks `[0,-1,1,-2,2]` tal cual el original), `ArrowDown` caída suave (+1 punto por fila), `Space` caída dura (+2 puntos por celda, con `preventDefault`). La tecla `KeyP` de pausa interna **no** se porta — `PAUSA` ya es un botón de React (mismo criterio que spec 05 aplicó al overlay de pausa interno de Asteroids).
- Al llegar a `status: "gameover"`, reusar el modal y el mecanismo `saveScore` (`lib/actions/scores.ts`) ya existentes sin modificarlos.
- El id de catálogo `caida` ya existe en Supabase (`title: "CAÍDA"`, `cat: "PUZZLE"`, `cover: "cover-tetro"`, `color: "magenta"`) — no se inserta ninguna fila nueva en `games`.
- Verificación: `npm run build` compila sin errores de TypeScript/ESLint, y prueba manual en navegador jugando una partida completa en `/juego/caida/jugar`.

**No incluye (fuera de este spec):**

- Toggle de tema claro/oscuro (`localStorage["tetris-theme"]`) del `index.html` original — la plataforma ya tiene su propio tema visual (CRT neon) y el toggle no aplica dentro de Arcade Vault.
- Controles táctiles/on-screen.
- Sonido/música (el original no tiene).
- Cambiar el mock de los demás juegos sin motor real (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Copiar `index.html`, `style.css`, `README.md`, `CLAUDE.md`, `.gitignore` o los workflows/`commands` del juego de referencia — solo se porta la lógica de `game.js`.
- Cambiar el contrato genérico `ArcadeGameState`/`ArcadeGameProps` de `lib/games/types.ts` — Tetris se adapta al contrato existente (ver mapeo de `lives` arriba), no al revés.

## Modelo de datos

Este spec no introduce persistencia nueva ni tablas: reutiliza `games`/`scores` en Supabase y `saveScore` de `lib/actions/scores.ts` (spec 06), y los tipos de estado genéricos ya definidos en `lib/games/types.ts` (`ArcadeGameState`, `ArcadeGameCallbacks`, `ArcadeGameHandle`, `ArcadeGameProps`) — no se redefinen tipos específicos de Tetris para esto, a diferencia de cómo `AsteroidsState` existe como alias histórico.

Estructuras internas del motor (no persistidas, viven en la closure de `createCaidaGame`):

```ts
type Board = number[][]; // ROWS x COLS, 0 = vacío, 1-8 = índice de color de pieza
interface Piece {
  type: number; // 1-8
  shape: number[][];
  x: number;
  y: number;
}
```

## Plan de implementación

1. **Portar el motor.** Crear `lib/games/caida/engine.ts` con las constantes (`COLS=10`, `ROWS=20`, `BLOCK=30`, `COLORS`, `PIECES`, `LINE_SCORES`) y funciones (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`) tipadas dentro de la closure de `createCaidaGame(canvas, callbacks)`. Dibujo del tablero centrado en la resolución interna 800×600, con el panel SCORE/LINES/LEVEL/NEXT dibujado al costado dentro del mismo canvas. `spawn()` detecta colisión inmediata y en ese caso fija `status: "gameover"`, `lives: 0` y notifica vía `onStateChange` — no reinicia solo ni dibuja overlay propio. Loop con `dt` clamp y listeners de teclado registrados en `start()`/removidos en `stop()`, siguiendo las reglas duras de `.agents/skills/port-game/reference.md`.
2. **Componente canvas.** Crear `components/games/CaidaGame.tsx` (Client Component) tipado con `ArcadeGameProps`, resolución interna fija 800×600 escalada por `devicePixelRatio`, monta el motor en un `useEffect` con cleanup (`stop()`), traduce `onStateChange` a las props `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`, y reacciona a `paused` llamando `pause()`/`resume()` — mismo esqueleto que `AsteroidGame.tsx`.
3. **Registrar el juego.** Agregar la entrada `caida` en `lib/games/registry.ts` con `next/dynamic({ ssr: false })`. No se modifica `components/GamePlayer.tsx`.
4. **Verificación final.** Correr `npm run build` sin errores de TypeScript/ESLint. Probar manualmente en el navegador: jugar una partida en `/juego/caida/jugar`, confirmar movimiento lateral, rotación con wall kick, ghost piece, caída suave/dura, incremento de nivel y velocidad tras 10 líneas, pausa/reanudar, botón FIN, modal de fin de partida con guardado de puntuación real en Supabase, reinicio con "JUGAR DE NUEVO", y que el puntaje aparezca en `/juego/caida` y `/salon?game=caida`.

## Criterios de aceptación

- [ ] Existe `lib/games/caida/engine.ts` con la lógica portada (`createCaidaGame` implementando `ArcadeGameHandle`), sin errores de tipos.
- [ ] Existe `components/games/CaidaGame.tsx`, tipado con `ArcadeGameProps`, que monta el canvas y expone las props de estado/callbacks.
- [ ] `lib/games/registry.ts` incluye la entrada `caida` cargada con `next/dynamic({ ssr: false })`.
- [ ] En `/juego/caida/jugar` se ve el juego real de Tetris (tablero, pieza actual, ghost piece, siguiente pieza) en vez del `.game-arena` decorativo.
- [ ] El HUD superior de React (Puntuación, Nivel) refleja el estado real del juego; "Vidas" muestra 1 corazón mientras se juega y queda en 0 al perder.
- [ ] El canvas dibuja su propio panel SCORE/LINES/LEVEL/NEXT internamente, sin overlay de "GAME OVER" ni de "PAUSA" propios.
- [ ] El botón PAUSA detiene el loop del juego (la pieza deja de caer) y REANUDAR lo continúa; la tecla `P` no tiene efecto dentro del canvas.
- [ ] El botón FIN termina la partida inmediatamente y abre el modal de puntuación final.
- [ ] Al no poder spawnear una pieza nueva (game over real) se abre el mismo modal existente, permite ingresar iniciales y guarda en Supabase vía `saveScore`.
- [ ] "JUGAR DE NUEVO" reinicia el juego desde cero (score 0, nivel 1, tablero vacío).
- [ ] Los controles de teclado (←/→ mover, ↑/X rotar, ↓ caída suave, Espacio caída dura) funcionan igual que en el juego original.
- [ ] Limpiar una línea suma puntos según `LINE_SCORES × nivel`; cada 10 líneas sube el nivel y aumenta la velocidad de caída.
- [ ] No se insertó ninguna fila nueva en la tabla `games` (el id `caida` ya existía).
- [ ] Los demás juegos del catálogo sin motor real siguen mostrando el mock decorativo sin cambios.
- [ ] `npm run build` termina sin errores de TypeScript ni ESLint.

## Decisiones tomadas y descartadas

- **Id de catálogo `caida` reutilizado, sin insert nuevo** — ya existe en Supabase con `title: "CAÍDA"`, `cat: "PUZZLE"`, `cover: "cover-tetro"`, `color: "magenta"` (spec 06); se descarta crear un id nuevo o modificar la fila existente.
- **`lives` fijo en 1/0** — se descarta ocultar el stat "Vidas" del HUD de React condicionalmente por juego, porque `components/GamePlayer.tsx` es un componente compartido y esa condición extra rompería el principio de "un juego nuevo no toca GamePlayer.tsx" que dejó el refactor de registry. Un corazón único que se apaga al perder comunica el mismo estado sin tocar código compartido.
- **Resolución interna 800×600 con tablero centrado, en vez de una resolución interna angosta (300×600 o similar)** — mantiene el mismo contrato `INTERNAL_WIDTH`/`INTERNAL_HEIGHT` que usa Asteroids y evita introducir una segunda convención de tamaño de canvas por juego; el tablero 10×20 (300×600 a `BLOCK=30`) queda centrado con el panel HUD interno ocupando el resto del ancho disponible.
- **Panel SCORE/LINES/LEVEL/NEXT portado como dibujo interno del canvas, no como elementos DOM** — el original los pintaba en un `<aside>` HTML fuera del canvas; se descarta reproducir esa estructura DOM porque el componente React solo expone un `<canvas>` (mismo patrón que `AsteroidGame.tsx`). El HUD de React ya cubre Puntuación/Nivel; el panel interno del canvas es el que aporta Lines y Next.
- **Tecla `P` de pausa interna eliminada** — mismo criterio que spec 05 aplicó al overlay de pausa interno de Asteroids: el botón `PAUSA` de React ya es la única vía de pausa, evita dos mecanismos de pausa desincronizados.
- **Toggle de tema claro/oscuro fuera de alcance** — específico del `index.html` standalone original; la plataforma ya define su propio tema visual (CRT neon) y no tiene equivalente de "modo claro".
- **Se conserva el mapeo `LINE_SCORES`/velocidad por nivel tal cual el original** — no hay razón funcional para cambiarlo; es la lógica de puntuación central del juego que se está portando.
- **Reuso de `saveScore`/tablas de Supabase sin cambios** — evita tocar el mecanismo de persistencia ya validado en specs 05/06.
- **Sin controles táctiles ni sonido** — mismo alcance por defecto que spec 05 estableció para Asteroids; ampliaciones futuras van en su propio spec si se deciden.

## Identificados riesgos

- **Colisión de instancias del motor en desarrollo (Strict Mode).** Mismo riesgo que documentó spec 05 para Asteroids. Mitigación: seguir el mismo patrón de closure sin globals de módulo y remover listeners explícitamente en `stop()`.
- **Wall kicks y rotación con matrices no cuadradas (pieza I de 4×4).** El algoritmo `rotateCW`/`tryRotate` del original ya maneja esto correctamente; el port debe preservar la lógica de transposición tal cual, sin "simplificarla", para no introducir bugs de colisión sutil en la pieza I.
- **Doble fuente de "Nivel"/"Puntuación" (HUD interno del canvas vs. HUD de React).** Mismo patrón dual que Asteroids — ambos deben quedar sincronizados porque comparten la misma fuente de verdad (`onStateChange`), pero un desfase de un frame entre el dibujo interno y el `setState` de React es visualmente posible y no se considera un bug (mismo comportamiento aceptado en Asteroids).
