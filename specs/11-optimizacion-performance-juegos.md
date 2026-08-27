# 11 — Optimización de performance en los juegos

**Estado:** Done
**Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
**Fecha:** 2026-08-26

**Objetivo:** Auditar y optimizar el rendimiento (FPS/lag) de los 4 motores de juego (`asteroids`, `caida`, `bloque-buster`, `ranaria`) y sus componentes React (incluyendo `GamePlayer.tsx`), enfocándose en re-renders de React innecesarios que interfieren con el loop de canvas, sin refactorizar la arquitectura existente.

## Alcance

**Incluye:**

- Auditoría de re-render de React en los 4 componentes de juego: `components/games/AsteroidGame.tsx`, `CaidaGame.tsx`, `BloqueBusterGame.tsx`, `RanariaGame.tsx`. Buscar: estado de React actualizado en cada frame (`onStateChange` disparando `setState` en el padre en cascada), props que cambian de referencia en cada render (objetos/funciones inline), y efectos (`useEffect`) que se re-ejecutan de más por dependencias mal declaradas.
- Auditoría de `components/GamePlayer.tsx`: verificar si el HUD (score/vidas/nivel) al actualizarse re-renderiza el árbol completo incluyendo el `<canvas>` hijo, y si `TouchControls`/selector de skin fuerzan renders innecesarios del contenedor.
- Auditoría de los 4 `engine.ts` (`lib/games/<id>/engine.ts`): revisar el loop principal (`requestAnimationFrame`), frecuencia y costo de callbacks hacia React (`onStateChange` debería dispararse solo cuando el valor visible cambia — score/vidas/nivel/status — no en cada frame), y limpieza correcta en `stop()`/desmontaje para evitar loops duplicados bajo React Strict Mode.
- Fixes puntuales que no cambien el contrato `ArcadeGameHandle`/`ArcadeGameProps` (`lib/games/types.ts`) ni la arquitectura de "estado en la closure": memoización (`React.memo`, `useMemo`, `useCallback` donde aplique), evitar `setState` redundante (comparar valor antes de actualizar), evitar crear objetos/funciones nuevas en cada render que rompan memoización, corregir dependencias de `useEffect`.
- Verificación: `npm run build` sin errores + prueba manual jugando una partida completa en cada uno de los 4 juegos, confirmando visualmente que el movimiento se siente fluido (sin métrica de FPS formal, criterio subjetivo del usuario).

**No incluye (fuera de este spec):**

- Agregar juegos nuevos o cambiar mecánicas de gameplay.
- Cambios visuales o de skins (`lib/games/skins.ts`, paletas).
- Performance específica de mobile/táctil — ya cubierta por SPEC 09; este spec no duplica esa auditoría, aunque un fix aquí puede beneficiar también a mobile.
- Refactors estructurales grandes (ej. mover estado del canvas fuera de la closure del engine, cambiar el modelo de `ArcadeGameHandle`). Si durante la auditoría se detecta que un problema _requiere_ un refactor así para resolverse, se documenta como hallazgo pero no se implementa en este spec.
- Medición formal de FPS con herramientas (Chrome DevTools Performance profiling) como criterio de aceptación — queda como técnica opcional de diagnóstico, no como entregable.

## Modelo de datos

No aplica. Este spec no introduce ni modifica estructuras de datos, solo código de renderizado y ciclo de vida de componentes/engines existentes.

## Plan de implementación

1. Auditar `lib/games/asteroids/engine.ts` + `components/games/AsteroidGame.tsx`: identificar dónde se llama `onStateChange` y si se dispara más de lo necesario; revisar limpieza de `requestAnimationFrame` en `stop()`.
2. Auditar `lib/games/caida/engine.ts` + `components/games/CaidaGame.tsx` con el mismo criterio.
3. Auditar `lib/games/bloque-buster/engine.ts` + `components/games/BloqueBusterGame.tsx` con el mismo criterio.
4. Auditar `lib/games/ranaria/engine.ts` + `components/games/RanariaGame.tsx` con el mismo criterio.
5. Auditar `components/GamePlayer.tsx`: confirmar si el `<canvas>`/wrapper del juego está memoizado o si re-renderiza en cada actualización de HUD; aplicar `React.memo`/reestructuración de props si hace falta.
6. Aplicar los fixes puntuales encontrados en los pasos 1-5 (cada paso deja el sistema funcional — build pasa después de cada cambio).
7. Prueba manual: jugar una partida completa en cada uno de los 4 juegos, confirmar fluidez visual y ausencia de regresiones (controles, HUD, modal de fin de juego, guardado de score).

## Criterios de aceptación

- [x] `npm run build` pasa sin errores tras todos los cambios.
- [x] `npm run lint` pasa sin errores nuevos.
- [x] Los 4 engines siguen respetando el contrato `ArcadeGameHandle`/`ArcadeGameProps` sin cambios de firma.
- [x] Cada uno de los 4 juegos fue jugado manualmente una partida completa tras los cambios, confirmando fluidez visual percibida (sin lag notorio) por el usuario.
- [x] HUD, pausa, modal de fin de juego y guardado de score siguen funcionando igual que antes en los 4 juegos (sin regresión funcional).
- [x] Se documenta en el PR/commit qué causa de lag se encontró en cada juego (si alguna) y qué fix se aplicó.

## Decisiones tomadas y descartadas

- **Alcance: los 4 juegos + `GamePlayer.tsx`, no solo uno.** El usuario pidió revisar "cada uno" — se descarta limitar a un solo juego sospechoso.
- **Causa sospechada de partida: re-render React excesivo.** Se prioriza esa hipótesis en la auditoría, pero no se descartan otras causas (loop mal limpiado, cálculo O(n²)) si aparecen durante la revisión.
- **Sin refactor arquitectónico grande.** El usuario pidió explícitamente solo optimizaciones puntuales — se descarta mover estado del engine fuera de la closure o cambiar el contrato compartido, aunque eso implique dejar algún hallazgo sin resolver (se documenta como riesgo/deuda).
- **Criterio de aceptación subjetivo, no métrica de FPS.** El usuario eligió prueba manual en vez de profiling formal — se descarta requerir capturas de DevTools Performance como entregable.
- **Fuera de scope: mobile-specific.** Ya cubierto por SPEC 09; se evita duplicar esa auditoría aunque las mismas mejoras beneficien el rendimiento en dispositivos táctiles.

## Riesgos identificados

- Si la causa raíz real requiere el refactor grande descartado en este spec (ej. estado del engine acoplado a props de React), el fix puntual puede ser solo un parche parcial — quedaría como spec de seguimiento.
- Sin métrica de FPS, "arreglado" depende de percepción subjetiva del usuario; puede haber desacuerdo sobre si la mejora es suficiente.
- Cambios en `GamePlayer.tsx` (compartido por los 4 juegos) tienen mayor blast radius que tocar un solo engine — un error ahí rompe los 4 juegos a la vez.
