# 01 — RANARIA: cruce de carriles arcade tipo Frogger

**Estado:** Approved
**Tema de la jam:** Frogger — cruce de carriles con colisión multi-carril, complejidad media
**Depende de:** SPEC 05, SPEC 06
**Fecha:** 2026-08-23

**Objetivo:** Diseñar desde cero un motor TypeScript de cruce de carriles (tipo Frogger) contra el contrato `ArcadeGameHandle`, e integrarlo como el juego jugable real detrás del id `ranaria`, ya sembrado en el catálogo de Supabase, reemplazando el mock decorativo por una partida completa con HUD, pausa, fin de partida y guardado real de puntuación.

## Alcance

**Incluye:**

- Motor `createRanariaGame(canvas, callbacks)` en `lib/games/ranaria/engine.ts` implementando `ArcadeGameHandle` (`start`/`pause`/`resume`/`stop`), sin globals de módulo — todo el estado (rana, carriles, temporizador, score, vidas, nivel) vive dentro de la closure de la factory.
- Resolución interna fija 800×600, con una grilla de 16 columnas × 12 filas de 50×50px dibujada directamente en el canvas (sin dependencias DOM externas):
  - Fila 0 (arriba): fila de meta con 5 huecos/nenúfares repartidos en el ancho (columnas 1, 4, 7, 10, 13, cada uno de 2 celdas de ancho).
  - Filas 1–5: río, 5 carriles con troncos y tortugas moviéndose horizontalmente a velocidad y dirección propias por carril; las tortugas se hunden periódicamente (parpadeo antes de hundirse).
  - Fila 6: mediana segura (césped, sin obstáculos).
  - Filas 7–11: carretera, 5 carriles con autos/camiones de distinto ancho, velocidad y dirección por carril.
  - Fila 11 también actúa como fila de salida/spawn de la rana (zona seria, sin vehículos en la columna de spawn al iniciar cada vida).
- Movimiento de la rana en pasos discretos de una celda por pulsación de flecha (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`), disparado en el evento `keydown` (ignorando `event.repeat` para exigir soltar y volver a presionar — control preciso tipo arcade clásico, no movimiento continuo).
- Colisión y física de cada zona:
  - Carretera (filas 7–11): tocar un auto pierde una vida.
  - Río (filas 1–5): la rana debe estar sobre un tronco o una tortuga a flote; si cae al agua (celda vacía o tortuga hundida) pierde una vida. Mientras está sobre un tronco/tortuga, la rana se desplaza horizontalmente arrastrada por la velocidad de ese carril (puede salir del canvas por los bordes laterales del río y pierde una vida si eso ocurre).
  - Meta (fila 0): entrar en un hueco de meta vacío sella ese hueco (nenúfar ocupado) y suma puntos; entrar fuera de un hueco (contra el borde de nenúfar ya ocupado o zona sólida) pierde una vida.
- Temporizador por vida: cada vida dispone de 25 segundos (barra/número dibujado en el HUD interno del canvas) para llegar a una meta; si llega a 0, se pierde una vida y la rana vuelve a la fila de spawn.
- Sistema de puntuación: +10 puntos por cada fila nueva avanzada (se registra la fila más alta alcanzada en la vida actual para no permitir farmear yendo y viniendo), +50 puntos por sellar un hueco de meta, +200 puntos y avance de nivel al sellar los 5 huecos de meta del nivel actual.
- Progresión de nivel: al sellar los 5 huecos de meta, `level++`, se reinician los 5 huecos (vacíos), la rana vuelve a la fila de spawn, y la velocidad de todos los carriles (autos, troncos, tortugas) se multiplica por un factor fijo (`1.15`) respecto del nivel anterior. Sin tope de nivel — el juego escala indefinidamente hasta agotar las vidas.
- Mapeo explícito a `ArcadeGameState`:
  - `score`: acumulado como se describe arriba, nunca decrece.
  - `lives`: inicia en 3; se descuenta por colisión en carretera, caída al río, entrada inválida a la meta, o expiración del temporizador. Al llegar a 0, `status: "gameover"`.
  - `level`: inicia en 1; sube al sellar los 5 huecos de meta del nivel actual.
  - `status`: `"playing"` en juego normal; `"dead"` durante una pausa breve (`deadTimer` de 1 segundo, mismo patrón que `lib/games/asteroids/engine.ts`) tras perder una vida, mientras se reproduce la animación de splash/impacto y antes de reubicar la rana en el spawn; `"gameover"` cuando `lives` llega a 0.
- HUD interno dibujado en el canvas (coexiste con el HUD de React): fila de meta con nenúfares sellados en verde, temporizador restante de la vida actual como barra numérica, y silueta de la rana. El HUD de React (Puntuación/Vidas/Nivel) es la fuente visible principal fuera del canvas.
- Componente cliente `components/games/RanariaGame.tsx`, tipado con `ArcadeGameProps`, canvas 800×600 escalado por `devicePixelRatio` dentro de `.crt-screen`, mismo esqueleto que `AsteroidGame.tsx` (montaje/cleanup del motor en `useEffect`, `pause()`/`resume()` reactivos a `paused`).
- Línea nueva en `lib/games/registry.ts`: `ranaria: dynamic(() => import("@/components/games/RanariaGame"), { ssr: false })`.
- Controles de teclado explícitos: `ArrowUp` avanza una fila, `ArrowDown` retrocede una fila (sin perder puntos ya ganados por filas ya alcanzadas), `ArrowLeft`/`ArrowRight` mueven una columna; las cuatro con `preventDefault()` para evitar scroll de la página.
- Reuso de `saveScore` (`lib/actions/scores.ts`) y del modal de fin de partida de `components/GamePlayer.tsx` sin modificarlos.
- El id de catálogo `ranaria` ya existe en Supabase (`title: "RANARIA"`, `cat: "ARCADE"`, `cover: "cover-rana"`, `color: "green"`, confirmado por lectura directa) — no se inserta ninguna fila nueva.
- Verificación: `npm run build` sin errores de TypeScript/ESLint, y prueba manual de una partida completa en `/juego/ranaria/jugar`.

**No incluye (fuera de este spec):**

- Controles táctiles/on-screen.
- Sonido/música — el tema (cruce de carriles) no exige audio para transmitir la mecánica; se deja fuera del alcance igual que hizo spec 05 con Asteroids.
- Tocar `components/GamePlayer.tsx` — el registro basta para que resuelva el juego vía `getGameComponent(id)`.
- Cambiar el contrato genérico `ArcadeGameState`/`ArcadeGameProps`/`ArcadeGameHandle` de `lib/games/types.ts` — Ranaria se adapta al contrato existente (ver mapeo de `status`/`dead` arriba), no al revés.
- Tocar cualquier otro juego del catálogo (`asteroids`, `caida`, `bloque-buster`, u otros mocks pendientes como `serpentina`, `gloton`, `invasores`, `duelo-pixel`).
- Selector de niveles manual o modo de práctica — la progresión es siempre secuencial y automática.

## Modelo de datos

Este spec no introduce persistencia nueva: reutiliza `games`/`scores` de Supabase (fila `ranaria` ya sembrada) y `saveScore` de `lib/actions/scores.ts`, además de los tipos genéricos de `lib/games/types.ts` (`ArcadeGameState`, `ArcadeGameCallbacks`, `ArcadeGameHandle`, `ArcadeGameProps`) sin redefinirlos.

Estructuras internas del motor (no persistidas, viven en la closure de `createRanariaGame`):

```ts
type LaneKind = "goal" | "river" | "safe" | "road";

interface Lane {
  row: number; // 0-11
  kind: LaneKind;
  direction: 1 | -1; // sentido de desplazamiento de los obstáculos del carril
  speed: number; // px/s, escalado por nivel
  obstacles: Obstacle[]; // autos/camiones en road, troncos/tortugas en river
}

interface Obstacle {
  x: number; // px, puede salir del rango [0, 800] y wrappear
  width: number; // px, múltiplo de 50 (autos cortos/camiones largos, troncos cortos/largos)
  kind: "car" | "truck" | "log-short" | "log-long" | "turtle";
  sinking?: boolean; // solo tortugas: alterna flotando/hundida
  sinkTimer?: number;
}

interface GoalSlot {
  col: number; // columna izquierda del hueco (2 celdas de ancho)
  filled: boolean;
}

interface Frog {
  col: number; // 0-15
  row: number; // 0-11
  ridingObstacle: Obstacle | null; // tronco/tortuga que la arrastra en el río
}
```

## Plan de implementación

1. **Motor.** Crear `lib/games/ranaria/engine.ts` con la grilla (16×12 celdas de 50px), la generación de los 10 carriles (5 río + 5 carretera) y sus obstáculos, la fila de meta con 5 `GoalSlot`, el movimiento discreto de la rana por `keydown` (ignorando `event.repeat`), la física de arrastre sobre troncos/tortugas, la detección de colisión/caída/expiración de temporizador (`killFrog()` análogo a `killShip()` de `lib/games/asteroids/engine.ts`: decrementa `lives`, fija `status: "dead"` con `deadTimer` de 1s si quedan vidas o `"gameover"` si no), el sellado de huecos de meta y el avance de nivel (reinicio de huecos + multiplicador de velocidad `1.15`), y el dibujo del tablero + HUD interno (nenúfares, temporizador, rana) dentro del propio canvas. Loop con `dt` clamp y listeners de teclado registrados en `start()`/removidos en `stop()`, sin globals de módulo.
2. **Componente canvas.** Crear `components/games/RanariaGame.tsx` (Client Component) tipado con `ArcadeGameProps`, resolución interna 800×600 escalada por `devicePixelRatio`, monta el motor en un `useEffect` con cleanup (`stop()`), traduce `onStateChange` a `onScoreChange`/`onLivesChange`/`onLevelChange`/`onGameOver` (disparando `onGameOver()` solo en la transición a `"gameover"`, igual que `AsteroidGame.tsx`), y reacciona a `paused` con `pause()`/`resume()`.
3. **Registro.** Agregar la entrada `ranaria: dynamic(() => import("@/components/games/RanariaGame"), { ssr: false })` en `lib/games/registry.ts`. No se toca `components/GamePlayer.tsx`.
4. **Catálogo.** Ninguna acción — la fila `ranaria` ya existe en Supabase con `cat`/`cover`/`color` correctos; no se ejecuta insert.
5. **Verificación final.** `npm run build` sin errores de TypeScript/ESLint. Prueba manual completa en `/juego/ranaria/jugar`: cruzar la carretera esquivando autos, cruzar el río sobre troncos/tortugas (incluyendo caer al perder pie en una tortuga que se hunde), sellar los 5 huecos de meta, subir de nivel y notar el aumento de velocidad, agotar el temporizador de una vida, perder las 3 vidas y verificar el modal de fin de partida con guardado real vía `saveScore`, pausa/reanudar con el botón de React, botón FIN, y "JUGAR DE NUEVO" reiniciando desde cero.

## Criterios de aceptación

- [ ] Existe `lib/games/ranaria/engine.ts` con `createRanariaGame` implementando `ArcadeGameHandle`, sin errores de tipos y sin globals de módulo.
- [ ] Existe `components/games/RanariaGame.tsx`, tipado con `ArcadeGameProps`, que monta el canvas 800×600 escalado por `devicePixelRatio` dentro de `.crt-screen`.
- [ ] `lib/games/registry.ts` incluye la entrada `ranaria` cargada con `next/dynamic({ ssr: false })`.
- [ ] En `/juego/ranaria/jugar` se ve el juego real (grilla de carriles, rana, autos, troncos, tortugas, huecos de meta) en vez del mock decorativo.
- [ ] El HUD superior de React (Puntuación, Vidas, Nivel) refleja el estado real del motor.
- [ ] El canvas dibuja su propio HUD interno (nenúfares sellados, temporizador de la vida actual), sin overlay de "GAME OVER" ni de "PAUSA" propios.
- [ ] Los controles `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` mueven la rana una celda por pulsación, sin desplazamiento continuo al mantener presionada la tecla.
- [ ] Tocar un auto/camión en las filas 7–11 pierde una vida y reubica la rana en la fila de spawn tras la animación de `"dead"`.
- [ ] Caer al agua en las filas 1–5 (sin tronco/tortuga a flote debajo) pierde una vida con el mismo flujo.
- [ ] Montarse en un tronco o tortuga arrastra a la rana con el carril; una tortuga hundiéndose bajo la rana cuenta como caída al agua.
- [ ] Sellar los 5 huecos de la fila de meta sube el nivel, reinicia los huecos y aumenta la velocidad de todos los carriles.
- [ ] El temporizador por vida llega a 0 y provoca la pérdida de una vida si la rana no llegó a una meta a tiempo.
- [ ] Perder las 3 vidas dispara `status: "gameover"`, abre el modal existente, permite ingresar iniciales y guarda el puntaje vía `saveScore`.
- [ ] El botón PAUSA detiene el loop (nada se mueve, temporizador no corre) y REANUDAR lo continúa.
- [ ] El botón FIN termina la partida inmediatamente y abre el modal de puntuación final.
- [ ] "JUGAR DE NUEVO" reinicia el juego desde cero (score 0, 3 vidas, nivel 1, tablero y huecos de meta vacíos).
- [ ] No se insertó ninguna fila nueva en la tabla `games` (el id `ranaria` ya existía).
- [ ] Los demás juegos del catálogo sin motor real siguen mostrando el mock decorativo sin cambios.
- [ ] `npm run build` termina sin errores de TypeScript ni ESLint.

## Decisiones tomadas y descartadas

- **Juego elegido: cruce de carriles tipo Frogger, no otra variante del tema.** El tema recibido ya especifica "Frogger — cruce de carriles con colisión multi-carril, complejidad media", así que no hubo otra alternativa evaluada dentro del tema; la decisión real fue de mapeo al contrato, no de elección de mecánica.
- **Reuso del id `ranaria` ya sembrado, sin insertar fila nueva.** Ya existe en Supabase con `cat: "ARCADE"`, `cover: "cover-rana"`, `color: "green"` — encaja perfecto con el tema y evita colisión de ids; se descarta proponer un id nuevo.
- **`cat: ARCADE` conservada tal cual la fila existente** — no se evalúa cambiarla a `PUZZLE` (no hay resolución de acertijo, solo reflejos/timing) ni a `SHOOTER`/`VERSUS` (no aplica); `ARCADE` ya describe correctamente un cruce de carriles con reflejos puros.
- **Movimiento discreto por celda en `keydown` (ignorando `event.repeat`), no continuo por frame** — se descarta el patrón de `keys: Record<string,boolean>` polled cada frame que usa Asteroids para rotación/empuje continuo, porque Frogger es un juego de grilla: cada pulsación debe mover exactamente una celda. Continuo rompería la lectura de colisión por celda y el control preciso que define el género.
- **Temporizador de 25s por vida** — decisión de diseño para inyectar presión de tiempo (elemento central del Frogger original) sin necesitar un stat nuevo en `ArcadeGameState`; se dibuja solo en el HUD interno del canvas (no se expone como prop nueva en `ArcadeGameProps`) para no tocar el contrato genérico. Alternativa descartada: sin temporizador (jugar sin presión de tiempo), rechazada por diluir la identidad del género.
- **`lives` con flujo `"dead"` transitorio (1s) antes de reubicar la rana**, en vez de reubicar instantáneamente — mismo patrón ya validado en `lib/games/asteroids/engine.ts` (`deadTimer`), reutilizado aquí para dar feedback visual de la colisión/caída sin inventar un mecanismo nuevo.
- **Puntuación por fila más alta alcanzada (no por cada movimiento hacia adelante sin control)** — evita que el jugador farmee puntos moviéndose arriba/abajo repetidamente entre las mismas dos filas; solo se puntúa la primera vez que se alcanza una fila nueva en la vida actual. Retroceder no resta puntos ya ganados.
- **Progresión de nivel infinita con multiplicador de velocidad `1.15`**, sin tope — coherente con el criterio "acumulativo apto para leaderboard" del contrato: el juego nunca "termina por victoria", solo por agotar vidas, maximizando la comparabilidad de puntajes en el leaderboard.
- **Sin sonido** — el tema no lo exige explícitamente (a diferencia de spec 08, donde el usuario lo pidió de forma explícita para Bloque Buster); se mantiene el criterio por defecto de spec 05 de dejarlo fuera salvo pedido explícito.
- **Solo teclado, sin mouse ni táctil** — a diferencia de Bloque Buster (donde el original ya traía soporte de mouse), Frogger es un juego de grilla discreta sin precedente de control por mouse/táctil que portar; se descarta agregarlo sin base que justifique el esfuerzo.
- **Grilla 16×12 de celdas de 50px dentro de la resolución interna fija 800×600`** — mantiene la misma convención `INTERNAL_WIDTH`/`INTERNAL_HEIGHT`que Asteroids y Bloque Buster (los dos juegos ya 4:3), evitando introducir letterboxing como sí hizo`caida` (tablero angosto 300×600); el tablero de Frogger cabe naturalmente en 4:3 sin recorte.

## Riesgos identificados

- **Colisión de instancias del motor en React Strict Mode.** Mismo riesgo documentado en specs 05/07/08. Mitigación: toda la grilla, carriles, temporizador y estado de la rana viven en la closure de `createRanariaGame` (cero globals de módulo); listeners de teclado se registran en `start()` y se remueven en `stop()`.
- **Doble contador de tiempo (temporizador de vida en el motor vs. `dt` del loop).** El temporizador de 25s debe descontarse con el mismo `dt` clamp del loop (`Math.min(dt, 0.05)`), nunca con `Date.now()` directo, para que la pausa de React (`pause()` detiene `requestAnimationFrame`) también congele el temporizador sin lógica adicional.
- **Arrastre sobre troncos/tortugas puede empujar a la rana fuera de la grilla por los bordes laterales del río.** Debe tratarse igual que caer al agua (pérdida de vida), no como un `clamp` silencioso que la deje "flotando" fuera de cámara — de lo contrario el estado de la rana queda inconsistente con la grilla de colisión.
- **Sincronización de `event.repeat` entre navegadores.** Distintos navegadores pueden emitir el primer `keydown` con `repeat: false` de forma consistente, pero conviene validar manualmente que mantener presionada una flecha no produzca movimiento continuo no deseado antes de dar por cerrada la verificación manual del plan de implementación.
- **Múltiples teclas de dirección presionadas casi simultáneamente.** Debe resolverse con "el primer `keydown` no repetido gana, se ignora cualquier otro hasta que se suelten todas las teclas relevantes" o un criterio equivalente explícito en el motor, para evitar que la rana intente moverse en dos direcciones en el mismo frame.
