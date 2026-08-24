# 09 — Controles táctiles para móvil

**Estado:** Approved
**Depende de:** SPEC 05, SPEC 07, SPEC 08
**Fecha:** 2026-08-23

**Objetivo:** Agregar un control táctil compartido (D-pad + 2 botones de acción) debajo del canvas en `/juego/:id/jugar`, visible solo en dispositivos táctiles, que despacha los mismos eventos de teclado que ya escuchan los motores de Asteroids, Caída y Bloque Buster.

## Alcance

**Incluye:**

- Componente compartido `components/TouchControls.tsx` (`"use client"`): D-pad de 4 flechas (arriba/abajo/izquierda/derecha) + 2 botones de acción (A/B), estilo CRT/neón consistente con `.btn`/`.pixel` de `app/globals.css`.
- Tabla de mapeo por juego `lib/games/touchControls.ts`: `Record<gameId, TouchControlMap>` donde cada entrada define qué `code` de teclado dispara cada control (`up`/`down`/`left`/`right`/`buttonA`/`buttonB`), y qué controles quedan sin uso (se muestran deshabilitados/atenuados en vez de ocultarse, para mantener el layout del D-pad consistente entre juegos).
- Mapeo concreto:
  - `asteroids`: `left → ArrowLeft`, `right → ArrowRight`, `up → ArrowUp`, `down` sin uso, `buttonA → Space` (disparar), `buttonB` sin uso.
  - `caida`: `left → ArrowLeft`, `right → ArrowRight`, `up → ArrowUp` (rotar), `down → ArrowDown` (caída suave), `buttonA → Space` (caída dura), `buttonB` sin uso.
  - `bloque-buster`: `left → ArrowLeft`, `right → ArrowRight`, `up`/`down` sin uso, `buttonA`/`buttonB` sin uso.
- Mecanismo de input: al presionar un control se despacha `window.dispatchEvent(new KeyboardEvent("keydown", { code }))`; al soltar (o al salir del botón con el dedo, `pointerleave`/`pointercancel`), se despacha `keyup` con el mismo `code`. No se modifica ningún engine existente — ya escuchan `keydown`/`keyup` en `window`.
- Eventos táctiles vía Pointer Events (`onPointerDown`/`onPointerUp`/`onPointerLeave`/`onPointerCancel`) para soportar tanto touch como mouse/pen sin listeners duplicados, con `touch-action: none` en los botones para evitar scroll/zoom accidental al arrastrar el dedo entre controles.
- Detección de dispositivo táctil: `window.matchMedia("(pointer: coarse)")`, evaluado una vez al montar `GamePlayer`. Si no es táctil, `TouchControls` no se renderiza (no solo se oculta con CSS).
- Integración en `components/GamePlayer.tsx`: `TouchControls` se renderiza una sola vez, debajo de `.crt` (canvas), condicionado a `isReal && isTouchDevice`, recibe `gameId={game.id}` y resuelve su propio mapeo — `GamePlayer.tsx` no ramifica por `game.id`.
- Layout mobile: en viewport angosto (`max-width: 720px`, breakpoint ya usado en `app/globals.css`), el `.crt` (canvas) queda arriba y `TouchControls` fijo debajo, ambos dentro del flujo normal de `.av-player` (sin `position: fixed` ni overlay sobre el canvas).
- Verificación: `npm run build` sin errores; prueba manual con Chrome DevTools en modo dispositivo móvil (emulación táctil) jugando una partida completa en cada uno de los 3 juegos.

**No incluye (fuera de este spec):**

- Soporte táctil para juegos sin motor real (mock decorativo) — `TouchControls` no se renderiza para esos ids.
- Rediseño del HUD superior (`player-hud`) de `GamePlayer.tsx` para mobile — solo se agrega el panel de controles debajo del canvas, el HUD existente no cambia.
- Gestos (swipe, drag) o joystick virtual analógico — el control es D-pad discreto + botones, mismo modelo que un control de arcade físico.
- Vibración háptica (`navigator.vibrate`) al presionar botones.
- Orientación forzada (landscape lock) o pantalla completa (`requestFullscreen`) en móvil.
- Extender `ArcadeGameHandle`/`ArcadeGameProps` (`lib/games/types.ts`) con un método de input táctil — se descarta a favor de eventos de teclado sintéticos.
- Botón B funcional en los 3 juegos actuales — queda reservado en el mapeo para juegos futuros con una segunda acción (ej. hyperspace, giro alterno).

## Modelo de datos

No hay persistencia nueva. Se agrega una estructura de configuración estática (no persistida) en `lib/games/touchControls.ts`:

```ts
interface TouchControlMap {
  up?: string; // KeyboardEvent.code
  down?: string;
  left?: string;
  right?: string;
  buttonA?: { code: string; label: string }; // ej. { code: "Space", label: "A" }
  buttonB?: { code: string; label: string };
}

const TOUCH_CONTROLS: Record<string, TouchControlMap> = {
  asteroids: {/* ... */},
  caida: {/* ... */},
  "bloque-buster": {/* ... */},
};
```

Reutiliza los `code` de `KeyboardEvent` ya usados por cada engine (`ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Space`), sin introducir una convención nueva de nombres de tecla.

## Plan de implementación

1. **Mapeo de controles.** Crear `lib/games/touchControls.ts` con `TouchControlMap`, `TOUCH_CONTROLS` (las 3 entradas de arriba) y `getTouchControls(gameId)`.
2. **Componente D-pad.** Crear `components/TouchControls.tsx`: D-pad (4 botones dispuestos en cruz) + 2 botones de acción a la derecha, estilo `.btn`/`.pixel`. Cada botón usa `onPointerDown`/`onPointerUp`/`onPointerLeave`/`onPointerCancel` para despachar `keydown`/`keyup` sintéticos con el `code` que le corresponde según `getTouchControls(gameId)`. Controles sin `code` mapeado (`down` en asteroids/bloque-buster, `buttonB` en los 3) se renderizan deshabilitados (`disabled`, atenuados).
3. **Detección táctil + integración.** En `components/GamePlayer.tsx`, agregar `useEffect`/`useState` que evalúa `window.matchMedia("(pointer: coarse)").matches` una vez al montar. Renderizar `<TouchControls gameId={game.id} />` debajo de `.crt` cuando `isReal && isTouchDevice`.
4. **CSS.** Agregar reglas en `app/globals.css` para `.touch-controls` (contenedor flex, D-pad en cruz, botones de acción), dentro del breakpoint `@media (max-width: 720px)` ya existente, con `touch-action: none` en los botones interactivos.
5. **Verificación final.** `npm run build` sin errores de TypeScript/ESLint. Prueba manual en Chrome DevTools (modo dispositivo móvil, ej. "Pixel 7"): jugar Asteroids (rotar/empujar/disparar), Caída (mover/rotar/caída suave/caída dura) y Bloque Buster (mover paleta) completamente con el D-pad y los botones, sin usar teclado. Confirmar que en modo desktop (sin emulación táctil) el panel no aparece.

## Criterios de aceptación

- [ ] Existe `lib/games/touchControls.ts` con `TOUCH_CONTROLS` y `getTouchControls`, con las 3 entradas de mapeo documentadas arriba.
- [ ] Existe `components/TouchControls.tsx`, D-pad de 4 flechas + 2 botones de acción, que despacha `KeyboardEvent("keydown"/"keyup", { code })` sintéticos en `window` al presionar/soltar cada control.
- [ ] Los controles sin mapeo para el juego activo aparecen deshabilitados/atenuados, no ocultos.
- [ ] `GamePlayer.tsx` renderiza `TouchControls` debajo del canvas solo cuando `isReal` es `true` y `window.matchMedia("(pointer: coarse)").matches` es `true`.
- [ ] En modo desktop (sin `pointer: coarse`) el panel de controles táctiles no se renderiza.
- [ ] En `/juego/asteroids/jugar` con emulación táctil, el D-pad rota la nave (izq/der), el botón arriba empuja, y el botón A dispara — sin tocar el teclado.
- [ ] En `/juego/caida/jugar` con emulación táctil, el D-pad mueve/rota/hace caída suave, y el botón A hace caída dura — sin tocar el teclado.
- [ ] En `/juego/bloque-buster/jugar` con emulación táctil, el D-pad izq/der mueve la paleta — sin tocar el teclado.
- [ ] Ningún engine (`lib/games/asteroids/engine.ts`, `lib/games/caida/engine.ts`, `lib/games/bloque-buster/engine.ts`) fue modificado.
- [ ] `npm run build` termina sin errores de TypeScript ni ESLint.

## Decisiones tomadas y descartadas

- **Eventos de teclado sintéticos en vez de extender `ArcadeGameHandle`** — decisión explícita del usuario. Cero cambios en los 3 engines existentes; solo se agrega una tabla de mapeo de datos. Se descarta un método `handleTouchInput()` en el contrato porque obligaría a tocar los 3 engines y a mantener dos caminos de input (teclado directo + método explícito) por juego.
- **D-pad + 2 botones fijo, igual para todos los juegos** — decisión explícita del usuario, basada en que la mayoría de juegos arcade clásicos usan máximo 2 botones de acción. Se descarta un joystick virtual analógico o gestos de swipe (más trabajo de UI, no aporta valor cuando el input real es discreto: teclas, no ejes continuos).
- **Componente único en `GamePlayer.tsx`, no uno por juego** — mismo criterio que `registry.ts`: un juego nuevo no debería requerir tocar `GamePlayer.tsx`; el mapeo vive en datos (`touchControls.ts`), no en ramas de código por id.
- **Visibilidad condicionada a `pointer: coarse`, no siempre visible** — decisión explícita del usuario. Evita que el panel ocupe espacio en desktop donde el teclado ya es el input natural.
- **Controles sin mapeo se muestran deshabilitados, no ocultos** — mantiene el mismo layout de D-pad+2 botones en los 3 juegos actuales y en los futuros, evitando saltos de diseño según cuántas acciones tenga cada juego.
- **`Pointer Events` en vez de `Touch Events`** — cubre touch, mouse y pen con un solo set de listeners, evita duplicar lógica de `touchstart`/`mousedown`.
- **Sin vibración, sin fullscreen, sin lock de orientación** — fuera de alcance explícito; el usuario solo pidió que los juegos se puedan jugar en móvil táctil, no una experiencia mobile-first completa.

## Riesgos identificados

| Riesgo                                                                                                                                                             | Mitigación                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eventos sintéticos de teclado no disparan `keydown`/`keyup` reales del navegador en todos los motores si alguno usara `addEventListener` con opciones restrictivas | Los 3 engines ya escuchan `keydown`/`keyup` en `window` sin filtros de `isTrusted`; verificado por grep antes de escribir este spec.                                                                                               |
| Doble input (dedo mantiene botón + teclado físico en tablet con teclado externo)                                                                                   | Ambos caminos escriben al mismo estado `keys[code]` del engine; presionar y soltar en cualquier orden no deja el estado "trabado" porque cada fuente dispara su propio `keyup`.                                                    |
| Canvas 800×600 interno escalado muy pequeño en pantallas angostas, dejando poco espacio para el D-pad debajo                                                       | Fuera de alcance de este spec (el escalado responsive del canvas ya existe desde specs 05/07/08); si el layout queda apretado en pantallas muy chicas es un ajuste de CSS de seguimiento, no bloquea la funcionalidad del control. |

## Lo que **no** está en este spec

- Rediseño completo del HUD para mobile.
- Gestos, swipe o joystick analógico.
- Vibración háptica, fullscreen u orientación forzada.
- Soporte táctil para juegos sin motor real (mock).
- Botón B funcional (queda reservado para juegos futuros).

Cada uno de estos, si se necesita, va en su propio spec.
