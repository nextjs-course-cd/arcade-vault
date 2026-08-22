# 05 — ROCAS: Asteroids real

**Estado:** Approved
**Depende de:** —
**Fecha:** 2026-08-22

**Objetivo:** Portar el clon de Asteroids de `references/started-games/02-asteroids/` a TypeScript e integrarlo como el juego jugable real detrás del id `asteroids` en `app/juego/[id]/jugar/page.tsx`, reemplazando el mock actual (puntaje falso aleatorio, decoraciones CSS) por el juego funcional con HUD, pausa, fin de partida y guardado de puntuación real.

## Alcance

**Incluye:**

- Portar `game.js` (clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, loop `update`/`draw`) a un módulo TypeScript en `lib/games/asteroids/engine.ts`, sin usar globals de módulo: la lógica queda encapsulada en una factory `createAsteroidsGame(canvas, callbacks)` que devuelve un handle (`start`, `pause`, `resume`, `stop`) para poder montarla/desmontarla desde React sin colisiones entre instancias.
- Mantener el sistema de power-up de disparo triple (`PowerUp`, `tripleShot`) tal cual existe en el código fuente.
- Mantener el HUD dibujado internamente en el canvas (`drawHUD`: texto SCORE/NIVEL/iconos de vidas) tal cual el original — no se borra, coexiste con el HUD de React. Quitar solo el overlay interno de `GAME OVER` con reinicio por Espacio (`drawOverlay`, rama `pressed('Space')` en `initGame` dentro de `update`), para no duplicar el flujo de fin de partida que ya maneja el modal de React. El estado (`score`, `lives`, `level`, `state`) se expone además vía callback (`onStateChange`) para que el HUD de React lo refleje en paralelo al HUD del canvas.
- Crear componente cliente `components/games/AsteroidGame.tsx` que monta el `<canvas>`, instancia el motor vía `createAsteroidsGame`, escala el canvas de forma responsive manteniendo 4:3 (resolución interna fija tipo 800×600, escalado por CSS/`devicePixelRatio` al tamaño real del contenedor `.crt-screen`), y recibe sus props tipadas como `AsteroidsGameProps` (ver Modelo de datos) — el contrato completo de cómo React se comunica con el canvas del juego.
- Modificar `app/juego/[id]/jugar/page.tsx`: cuando `game.id === 'asteroids'`, renderizar `AsteroidGame` en lugar del bloque `.game-arena` decorativo (divs `.enemy`/`.player-ship`) y eliminar el `setInterval` de puntaje falso solo para este caso; el HUD existente (Jugador/Puntuación/Vidas/Nivel) pasa a reflejar el estado real emitido por el motor.
- Cablear los botones existentes: `PAUSA` llama a `pause()`/`resume()` del handle del motor (detiene/reanuda el loop `requestAnimationFrame`); `FIN` fuerza el game over inmediato (equivalente a agotar las 3 vidas) y dispara el modal existente; `JUGAR DE NUEVO` reinstancia el motor desde cero (`restart`).
- Al llegar a 0 vidas, reusar el modal y el mecanismo `saveScore`/`localStorage` (`av_scores`) ya existentes sin modificarlos.
- Controles: solo teclado, igual que el original (`ArrowLeft`/`ArrowRight`/`ArrowUp` rotar/propulsar, `Space` disparar).
- Verificación: `npm run build` compila sin errores de TypeScript/ESLint, y prueba manual en navegador jugando una partida completa en `/juego/asteroids/jugar`.

**No incluye (fuera de este spec):**

- Controles táctiles/on-screen para el juego (el tag "TÁCTIL" de la página de detalle sigue siendo aspiracional; se implementa en un spec futuro si se decide dar soporte móvil).
- Cambiar el mock de los demás juegos (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) — siguen con el `.game-arena` decorativo y el `setInterval` de puntaje falso.
- Un "motor de juegos" genérico/pluggable para reusar entre distintos títulos. Esta arquitectura es específica de Asteroids; si se ports otro juego después, se evalúa reuso en su propio spec.
- Migrar `av_scores`/`saveScore` a Supabase (eso es un spec futuro de persistencia real, ver spec 04).
- Actualizar el campo `best`/`plays` estático de `GAMES` en `lib/data.ts` en base a partidas reales.
- Copiar `index.html`, `README.md`, `CLAUDE.md` o `favicon.svg` del juego de referencia — solo se porta la lógica de `game.js`.
- Sonido/música (el original no tiene).

## Modelo de datos

Este spec no introduce persistencia nueva ni tablas. Reutiliza `SavedScore` / `av_scores` en `localStorage` ya definidos en `app/juego/[id]/jugar/page.tsx`.

Se introduce un tipo de estado interno del motor (no persistido), expuesto vía callback:

```ts
interface AsteroidsState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}
```

Se introduce además la interfaz `AsteroidsGameProps`: el contrato completo de comunicación entre el componente `AsteroidGame` (canvas) y React.

```ts
interface AsteroidsGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: () => void;
}
```

## Plan de implementación

1. **Portar el motor.** Crear `lib/games/asteroids/engine.ts` con las clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp` tipadas, y una factory `createAsteroidsGame(canvas: HTMLCanvasElement, callbacks: { onStateChange(state: AsteroidsState): void })` que encapsula el estado (antes globals de módulo) y devuelve `{ start(), pause(), resume(), stop() }`. Se conserva `drawHUD` (HUD dibujado en el canvas) tal cual el original; se quita solo el overlay de `GAME OVER` y su reinicio automático por Espacio. `killShip()` al llegar a 0 vidas actualiza el estado y notifica vía `onStateChange`, no reinicia solo.
2. **Componente canvas.** Crear `components/games/AsteroidGame.tsx` (Client Component), tipado con `AsteroidsGameProps`, que monta el `<canvas>` a resolución interna fija (800×600) escalado por CSS a 4:3 responsive dentro de su contenedor, instancia el motor en un `useEffect`, limpia (`stop()`) en el cleanup, y traduce `onStateChange` a las props `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver`. Reacciona a la prop `paused` llamando `pause()`/`resume()`.
3. **Integrar en la página de juego.** En `app/juego/[id]/jugar/page.tsx`, ramificar por `game.id === 'asteroids'`: renderizar `AsteroidGame` dentro de `.crt-screen` en vez del `.game-arena` decorativo, eliminar el `setInterval` de puntaje falso para este caso, y conectar su estado real (`score`, `lives`, `level`) al HUD existente. Los botones `PAUSA`/`FIN`/`JUGAR DE NUEVO` se cablean al handle del motor.
4. **Verificación final.** Correr `npm run build` sin errores de TypeScript/ESLint. Probar manualmente en el navegador: jugar una partida en `/juego/asteroids/jugar`, confirmar rotación/propulsión/disparo, división de asteroides, power-up 3x, pérdida de vidas con parpadeo de invencibilidad, pausa/reanudar, botón FIN, modal de fin de partida con guardado de puntuación en `localStorage`, y reinicio con "JUGAR DE NUEVO".

## Criterios de aceptación

- [ ] Existe `lib/games/asteroids/engine.ts` con la lógica portada (clases + factory `createAsteroidsGame`), sin errores de tipos.
- [ ] Existe `components/games/AsteroidGame.tsx`, tipado con `AsteroidsGameProps`, que monta el canvas y expone las props de estado/callbacks.
- [ ] En `/juego/asteroids/jugar` se ve el juego real de Asteroids (nave, asteroides, disparo, partículas) en vez del `.game-arena` decorativo.
- [ ] El HUD superior (Puntuación, Vidas, Nivel) refleja el estado real del juego, no un contador aleatorio.
- [ ] El canvas sigue dibujando su propio HUD (SCORE/NIVEL/vidas), en paralelo al HUD de React, pero ya no muestra su propio overlay de "GAME OVER".
- [ ] El botón PAUSA detiene el loop del juego (la nave/asteroides dejan de moverse) y REANUDAR lo continúa.
- [ ] El botón FIN termina la partida inmediatamente y abre el modal de puntuación final.
- [ ] Al perder las 3 vidas se abre el mismo modal existente, permite ingresar iniciales y guarda en `localStorage` bajo `av_scores`.
- [ ] "JUGAR DE NUEVO" reinicia el juego desde cero (score 0, 3 vidas, nivel 1).
- [ ] Los controles de teclado (flechas + espacio) funcionan igual que en el juego original.
- [ ] El power-up de disparo triple sigue funcionando (aparece tras destruir asteroides, dura 5s).
- [ ] Los demás juegos del catálogo (`bloque-buster`, `caida`, etc.) siguen mostrando el mock decorativo sin cambios.
- [ ] `npm run build` termina sin errores de TypeScript ni ESLint.

## Decisiones tomadas y descartadas

- **Alcance solo para `asteroids` (id de catálogo, título visible sigue siendo "ROCAS")** — se descarta construir un motor de juegos genérico/pluggable ahora; se prefiere resolver un caso concreto primero y evaluar reuso cuando exista un segundo juego real que portar.
- **Puerto a TypeScript** — se descarta copiar `game.js` tal cual sin tipar; el proyecto es TypeScript estricto y tipar el motor facilita mantenerlo e integrarlo con React.
- **Factory encapsulada en vez de globals de módulo** — el `game.js` original usa variables globales (`ship`, `score`, etc.), lo cual no es seguro para montar/desmontar en React (Strict Mode monta efectos dos veces en desarrollo). Se decide encapsular todo el estado dentro de la closure devuelta por `createAsteroidsGame`.
- **HUD dual: canvas + React** — se mantiene el `drawHUD` interno del juego (score/nivel/vidas dibujados en el canvas, tal como el original) y además se expone el mismo estado vía callback para que el HUD de React lo muestre en paralelo. Decisión explícita del usuario: no se borra el HUD del juego.
- **Modal de React reemplaza el "GAME OVER" interno** — se descarta mantener el overlay de texto + reinicio por Espacio del juego original porque la plataforma ya tiene su propio modal con captura de iniciales y guardado de puntuación; mantener ambos sería confuso y redundante.
- **Se conserva el power-up de disparo triple** — aunque no está documentado en el README del juego de referencia, es parte del código fuente que se está adaptando; no hay razón para quitarlo.
- **Solo teclado, sin controles táctiles** — se mantiene el alcance original del juego; soporte táctil es una ampliación de alcance que se evalúa en un spec futuro si se decide.
- **Reuso de `saveScore`/`av_scores` sin cambios** — evita tocar el mecanismo de persistencia ya validado en specs anteriores; la migración a Supabase es un tema aparte (fuera de alcance, ver spec 04).
- **Canvas responsive a 4:3 con resolución interna fija** — se descarta el canvas fijo 800×600 porque no se ajustaría bien al contenedor `.crt-screen` (que ya es responsive) en pantallas grandes o pequeñas.

## Identificados riesgos

- **Colisión de instancias del motor en desarrollo (Strict Mode).** Next.js en desarrollo monta y desmonta efectos dos veces; si `createAsteroidsGame` no limpia bien sus listeners de teclado (`keydown`/`keyup` en `window`) al llamar `stop()`, podrían quedar handlers duplicados. Mitigación: registrar los listeners dentro del handle devuelto y removerlos explícitamente en `stop()`.
- **Escalado de coordenadas del mouse/touch no aplica** (el juego es solo teclado), pero el escalado de canvas por CSS puede introducir borrosidad si no se maneja `devicePixelRatio`; mitigación menor, no bloqueante para este spec.
