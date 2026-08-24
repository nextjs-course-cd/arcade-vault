# 10 — Apariencia de gamepad neón para los controles táctiles

**Estado:** Approved
**Depende de:** SPEC 09
**Fecha:** 2026-08-23

**Objetivo:** Reemplazar la apariencia visual de `components/TouchControls.tsx` (botones cuadrados con texto/unicode) por el diseño "Gamepad MK-II" de `references/gamepad-assets/gamepad.html` — panel contenedor con borde/glow, D-pad con flechas SVG y hub central en diamante animado, y botones A/B circulares con anillo de glow — sin cambiar ninguna lógica de input ni el mapeo por juego.

## Alcance

**Incluye:**

- Reescritura completa del JSX de `components/TouchControls.tsx` para producir el markup del asset de referencia: panel `.gp` (`role="group" aria-label="Gamepad"`), `.gp-body` con dos columnas (`.gp-col-left` con el D-pad, `.gp-col-right` con A/B), D-pad `.gp-dpad` de 4 botones con ícono SVG (triángulos, mismos `path`/`viewBox` que `gamepad.html`) en vez de las flechas unicode actuales (`▲◀▶▼`), hub central `.dp-hub` con gema `.dp-hub-gem` (decorativo, `aria-hidden`) y animación de pulso (`@keyframes pulse-led`).
- Botones de acción A/B rediseñados como círculos con gradiente radial, glow de color (`--magenta` para A, `--cyan` para B — mismas variables ya usadas en el resto del sitio), letra central `.ab-letter` con `text-shadow` de neón, y anillo `.ab-ring` que aparece en hover/press.
- Reemplazo íntegro del bloque CSS `.touch-controls`/`.touch-dpad`/`.touch-key`/`.touch-actions` (`app/globals.css` líneas 1087-1157, y su ajuste responsive en 1660-1670) por las clases nuevas (`.gp`, `.gp-body`, `.gp-col`, `.gp-dpad`, `.dp`, `.dp-arrow`, `.dp-hub`, `.dp-hub-gem`, `.gp-actions`, `.ab`, `.ab-letter`, `.ab-ring`), adaptadas de `gamepad.html` pero reutilizando las variables ya definidas en `:root` de `app/globals.css` (`--cyan`, `--magenta`, `--ink-dim`, `--ink-faint`, `--line`, `--pixel`, `--mono` — ya existen con los mismos valores que usa el asset, sin necesidad de agregar variables nuevas).
- Ajuste responsive del gamepad dentro del bloque `@media (max-width: 720px)` ya existente en `app/globals.css` (el breakpoint canónico del proyecto), con los valores de reducción de tamaño que el asset original aplica a 620px (D-pad 144px→ajustado, botones D-pad ~46px, botones A/B ~64px), sin introducir 620px como breakpoint nuevo.
- Se preserva toda la lógica funcional ya existente en `TouchControls.tsx`: `getTouchControls(gameId)`, `dispatchKey` con `KeyboardEvent({ code, key: code })`, Pointer Events (`onPointerDown/Up/Leave/Cancel`) y el corte temprano (`if (!map) return null`).
- Botones sin mapeo para el juego activo (ej. botón B en `asteroids`/`caida`) se mantienen deshabilitados (`disabled`) y visualmente atenuados (opacidad reducida, sin color de acento), conservando la forma circular/glow del diseño nuevo — mismo criterio del SPEC 09, no se ocultan.
- Verificación: `npm run build` y `npm run lint` sin errores.

**No incluye (fuera de este spec):**

- Cambios en `lib/games/touchControls.ts` — el mapeo por juego (`up`/`down`/`left`/`right`/`buttonA`/`buttonB`) no se toca.
- Cambios en la lógica de detección táctil (`window.matchMedia("(pointer: coarse)")`) ni en `components/GamePlayer.tsx` más allá de lo que ya renderiza `<TouchControls gameId={game.id} />` — sigue siendo la única integración, sin ramas por `game.id`.
- Cambios en ningún engine (`lib/games/asteroids/engine.ts`, `lib/games/caida/engine.ts`, `lib/games/bloque-buster/engine.ts`).
- Vibración háptica, sonido al presionar, o cualquier feedback más allá del visual (glow/anillo/pulso) ya presente en el asset de referencia.
- Rediseño del resto del HUD (`.player-hud`) — solo cambia la apariencia del panel de controles táctiles debajo del canvas.
- Un breakpoint nuevo (620px) — se reutiliza el canónico del proyecto (720px).

## Modelo de datos

No hay persistencia ni estructuras de datos nuevas. Es un cambio 100% de presentación (JSX + CSS) sobre un componente cliente ya existente.

## Plan de implementación

1. **Variables reutilizadas.** Confirmar en `app/globals.css` que `--cyan`, `--magenta`, `--ink-dim` (`#8a8fb5`), `--ink-faint` (`#4a4f70`), `--line`, `--pixel`, `--mono` ya están definidas en `:root` (líneas 3-39) — ya lo están, no se agrega ninguna variable nueva.
2. **CSS del gamepad.** Reemplazar el bloque `.touch-controls`/`.touch-dpad`/`.touch-up`/`.touch-left`/`.touch-right`/`.touch-down`/`.touch-actions`/`.touch-key` (`app/globals.css` líneas 1087-1157) por las reglas `.gp`, `.gp::before`, `.gp::after`, `.gp-body`, `.gp-col`, `.gp-col-left`, `.gp-col-right`, `.gp-dpad`, `.dp`, `.dp-arrow`, `.dp:hover`, `.dp.on`/`.dp:active`, `.dp-hub`, `.dp-hub-gem`, `@keyframes pulse-led`, `.gp-actions`, `.ab`, `.ab.a`, `.ab.b`, `.ab-letter`, `.ab-ring`, `.ab:hover .ab-ring`, `.ab.on`/`.ab:active`, adaptadas literalmente de `references/gamepad-assets/gamepad.html` pero con las variables del proyecto. Agregar `.dp:disabled`/`.ab:disabled` (atenuado: opacidad reducida, sin glow, sin color de acento) para los botones sin mapeo, ya que el asset original no contempla estado deshabilitado.
3. **Responsive.** Actualizar el bloque `@media (max-width: 720px)` existente (líneas ~1660-1670) con los tamaños reducidos de `.gp`, `.gp-dpad`, `.dp`, `.dp-hub`, `.ab`, `.gp-actions` tomados del bloque `@media (max-width: 620px)` del asset original.
4. **JSX de `TouchControls.tsx`.** Reescribir el componente:
   - Contenedor raíz `<div className="gp" role="group" aria-label="Gamepad">` → `<div className="gp-body">` → `.gp-col.gp-col-left` (D-pad) y `.gp-col.gp-col-right` (A/B), igual a la estructura del asset.
   - D-pad: 4 `<button>` con `className="dp dp-{dirección}"`, ícono `<svg className="dp-arrow" viewBox="0 0 24 24"><path d="..." fill="currentColor"/></svg>` (mismos `path` que `gamepad.html` para up/right/down/left), `aria-label` direccional, `disabled` cuando `map.<dirección>` no existe. `<div className="dp-hub" aria-hidden="true"><span className="dp-hub-gem"></span></div>` fijo, decorativo.
   - Acciones: 2 `<button className="ab {a|b}">` con `<span className="ab-ring"></span>` y `<span className="ab-letter">{label}</span>`, orden B (izquierda) / A (derecha) igual al asset, `disabled` cuando el botón no tiene mapeo.
   - Conservar `dispatchKey`, `onPointerDown/Up/Leave/Cancel` con `preventDefault()` exactamente como están hoy — solo cambia el markup/clases que envuelven cada botón.
5. **Verificación final.** `npm run build` sin errores de TypeScript/ESLint; `npm run lint` limpio. Prueba manual en `/juego/asteroids/jugar`, `/juego/caida/jugar` y `/juego/bloque-buster/jugar` con emulación táctil en DevTools: el gamepad se ve como `references/gamepad-assets/gamepad-neon.png`, el D-pad y A/B siguen disparando los mismos `code` de teclado que antes, y los botones sin mapeo aparecen atenuados pero no ocultos.

## Criterios de aceptación

- [ ] `components/TouchControls.tsx` renderiza el markup `.gp`/`.gp-body`/`.gp-dpad`/`.gp-actions` con flechas SVG y hub central, en vez de los botones cuadrados con unicode/texto anteriores.
- [ ] El bloque CSS de `app/globals.css` reemplaza por completo las clases `.touch-*` anteriores por `.gp`/`.dp`/`.ab` y derivadas, reutilizando `--cyan`, `--magenta`, `--ink-dim`, `--ink-faint`, `--line`, `--pixel`, `--mono` ya existentes en `:root`.
- [ ] El hub central (`.dp-hub-gem`) tiene la animación de pulso (`pulse-led`) igual que en `gamepad.html`.
- [ ] Los botones A/B muestran el anillo `.ab-ring` en hover y al presionar, con el glow de color correspondiente (magenta para A, cian para B).
- [ ] Los controles sin mapeo para el juego activo (ej. botón B en `asteroids`/`caida`, `down` en `asteroids`/`bloque-buster`) aparecen `disabled` y atenuados, sin glow ni color de acento, pero conservan la forma del diseño nuevo — no se ocultan.
- [ ] El ajuste responsive del gamepad vive dentro del bloque `@media (max-width: 720px)` ya existente en `app/globals.css` — no se introduce un breakpoint 620px nuevo.
- [ ] `getTouchControls(gameId)`, `dispatchKey` (`KeyboardEvent` con `code`/`key` sintéticos) y los Pointer Events (`onPointerDown/Up/Leave/Cancel`) siguen funcionando exactamente igual que antes — mismo `code` disparado por cada botón.
- [ ] Ningún archivo de `lib/games/touchControls.ts`, ningún engine (`lib/games/asteroids/engine.ts`, `lib/games/caida/engine.ts`, `lib/games/bloque-buster/engine.ts`) ni `components/GamePlayer.tsx` fue modificado.
- [ ] `npm run build` y `npm run lint` terminan sin errores.

## Decisiones tomadas y descartadas

- **Fidelidad 100% al asset de referencia** (panel contenedor, hub animado, flechas SVG, anillo de glow en A/B) — decisión explícita del usuario, en vez de un port parcial sin panel o sin animaciones. Se descartan las dos alternativas más simples (sin panel contenedor; sin animaciones de pulso/anillo) porque el usuario pidió la apariencia completa del asset.
- **Botones sin mapeo: atenuados pero con la misma forma circular/glow, no un estilo gris plano** — decisión explícita del usuario, consistente con el criterio ya establecido en el SPEC 09 ("controles sin mapeo se muestran deshabilitados, no ocultos") y con mantener el mismo lenguaje visual del gamepad nuevo en todos los estados.
- **Breakpoint 720px del proyecto, no 620px del asset** — decisión explícita del usuario. El asset es un componente standalone extraído sin contexto del resto del sitio; el proyecto ya tiene un breakpoint canónico para el reproductor (`/juego/:id/jugar`) y se reutiliza en vez de introducir uno nuevo específico del gamepad.
- **Reutilizar variables CSS existentes (`--ink-dim`, `--ink-faint`, etc.) en vez de copiar los valores hex del asset como literales nuevos** — los valores ya coinciden exactamente (`#8a8fb5`, `#4a4f70`), así que usar las variables evita duplicación y mantiene el gamepad coherente si la paleta del sitio cambia en el futuro.
- **Sin cambios en `lib/games/touchControls.ts` ni en la lógica de eventos** — es un spec puramente visual; el mapeo por juego y el mecanismo de `KeyboardEvent` sintético ya están resueltos y verificados en el SPEC 09, no hay razón para tocarlos.

## Riesgos identificados

| Riesgo                                                                                                                                                            | Mitigación                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El asset original no contempla un estado `disabled` (todos los botones asumen mapeo completo)                                                                     | Se agrega explícitamente `.dp:disabled`/`.ab:disabled` en el paso 2 del plan, con opacidad reducida y sin glow, siguiendo el mismo criterio del SPEC 09.                                                                             |
| El panel `.gp` del asset tiene `max-width: 760px` fijo y padding propio; puede verse desproporcionado dentro de `.av-player`, que ya tiene su propio ancho máximo | Verificar visualmente en las 3 rutas de juego durante la prueba manual del paso 5; si el panel se ve descuadrado, ajustar `max-width`/padding sin cambiar la estética general — es un ajuste de integración, no un cambio de diseño. |
| Las clases `.touch-*` se eliminan por completo; si algún otro archivo las referenciara quedarían selectores CSS muertos o JSX roto                                | Confirmado por grep antes de escribir este spec: `touch-key`/`touch-dpad`/`touch-actions`/`touch-controls` solo se usan en `components/TouchControls.tsx` y en el bloque CSS que este spec reemplaza — no hay otro consumidor.       |

## Lo que **no** está en este spec

- Cambios al mapeo de controles por juego (`lib/games/touchControls.ts`).
- Cambios a la lógica de detección táctil o a `GamePlayer.tsx`.
- Cambios a cualquier engine de juego.
- Sonido, vibración háptica u otro feedback no visual.
- Un breakpoint nuevo distinto al 720px ya existente.

Cada uno de estos, si se necesita, va en su propio spec.
