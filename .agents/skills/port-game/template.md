# Plantilla de spec para un port de juego

Referencia que consulta el skill `port-game` al escribir el spec en Fase 2. No es texto para copiar literal — es la forma que debe respetar, especializando el patrón genérico de `.agents/skills/spec/template.md` para el caso concreto de "portar un juego de `references/started-games/` a la plataforma". Los specs de este repo se escriben en español (ver `specs/05-rocas-asteroids-juego-real.md` y `specs/06-leaderboard-y-catalogo-supabase.md`); el spec de un port sigue ese mismo idioma y esas mismas secciones.

## Encabezado

```markdown
# NN — <Título del juego portado>

**Estado:** Draft
**Depende de:** SPEC 05, SPEC 06
**Fecha:** YYYY-MM-DD

**Objetivo:** Portar el juego de `references/started-games/<carpeta>/` a TypeScript e integrarlo como el juego jugable real detrás del id `<id>` en el catálogo, con motor, HUD, pausa, fin de partida y guardado real de puntuación en Supabase.
```

## Alcance

**Incluye** (adaptar de lo que ya hizo el spec 05, con los nombres reales del juego):

- Portar `game.js` (y archivos hermanos como `levels.js`/`assets/*.js` si existen) a `lib/games/<id>/engine.ts`, sin globals de módulo: factory `create<Nombre>Game(canvas, callbacks)` que devuelve `{ start, pause, resume, stop }` (`ArcadeGameHandle` de `lib/games/types.ts`).
- Mantener el HUD dibujado internamente en el canvas tal cual el original; quitar solo el overlay interno de fin de partida y su reinicio por tecla — el modal de React ya maneja ese flujo. El estado se expone vía `onStateChange` (`ArcadeGameState`).
- Crear `components/games/<Nombre>Game.tsx` (Client Component) que monta el canvas a resolución interna fija, lo escala responsive dentro de `.crt-screen`, tipado con `ArcadeGameProps`.
- Registrar el juego en `lib/games/registry.ts` (`ssr: false`).
- Reusar `saveScore` (`lib/actions/scores.ts`) y el modal de fin de partida existentes en `components/GamePlayer.tsx` sin modificarlos.
- Controles: enumerar exactamente cuáles del juego original se conservan.
- Mapeo explícito de conceptos del juego original a `score`/`lives`/`level` cuando no calcen 1:1 (p. ej. un juego sin "vidas").
- Assets binarios (si aplica): copiados a `public/games/<id>/...`, referenciados con rutas absolutas.
- Fila de catálogo en Supabase: indicar si el id ya existe (no se toca) o si hace falta un `INSERT` nuevo (con qué `title`/`cat`/`cover`/`color`).
- Verificación: `npm run build` sin errores, prueba manual de una partida completa en `/juego/<id>/jugar`.

**No incluye (fuera de este spec):**

- Controles táctiles (a menos que se decida explícitamente incluirlos).
- Cambiar el mock de los demás juegos sin motor real.
- Un motor de juegos "genérico" más allá de las interfaces ya compartidas en `lib/games/types.ts`.
- Sonido, si el original lo trae y no se decide incluirlo explícitamente.
- Copiar `index.html`/`README.md`/`CLAUDE.md`/`.gitignore`/workflows del juego de referencia.

## Modelo de datos

Este spec no introduce persistencia nueva: reutiliza `scores`/`games` en Supabase (spec 06) y `saveScore` (`lib/actions/scores.ts`). Si el id de catálogo no existe todavía, documentar aquí el `INSERT` exacto propuesto.

Reutiliza los tipos de estado de `lib/games/types.ts` (`ArcadeGameState`, `ArcadeGameCallbacks`, `ArcadeGameHandle`, `ArcadeGameProps`) — no se redefinen por juego salvo que el juego necesite un campo adicional no cubierto por el contrato genérico (justificar por qué en Decisiones).

## Plan de implementación

Numerar los pasos concretos (motor → componente → registro → catálogo → verificación), siguiendo la forma de `specs/05-rocas-asteroids-juego-real.md#plan-de-implementación`. Cada paso deja el sistema funcional.

## Criterios de aceptación

Checklist booleano — ver `specs/05-rocas-asteroids-juego-real.md#criterios-de-aceptación` como referencia de nivel de detalle esperado (existencia de archivos concretos, comportamiento observable de cada botón, controles, `npm run build` limpio).

## Decisiones tomadas y descartadas

Registrar explícitamente, con motivo:

- Por qué este id de catálogo y no otro (o por qué se creó uno nuevo).
- Cómo se resolvió el mapeo score/lives/level si el juego original no tenía un concepto equivalente.
- Qué se hizo con assets/sonido si el original los traía.
- Cualquier desviación del contrato genérico de `lib/games/types.ts`.

## Riesgos identificados

Solo si aplican riesgos no obvios más allá de los ya cubiertos por `.agents/skills/port-game/reference.md` (Strict Mode, listeners, dt sin clamp, `ssr:false`). Si no hay riesgos nuevos, se puede omitir la sección.
