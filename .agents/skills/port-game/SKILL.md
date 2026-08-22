---
name: port-game
description: Porta un juego vanilla de references/started-games/ a la plataforma Arcade Vault — escribe primero el spec en specs/ y, tras aprobación, implementa el motor TypeScript, el componente canvas, el registro en el reproductor y (si hace falta) la fila del catálogo en Supabase. Úsalo cuando el usuario quiera convertir un juego de referencia en un juego real jugable con leaderboard.
disable-model-invocation: true
argument-hint: "<carpeta-en-references/started-games> [id-de-catálogo]"
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash(ls:*), Bash(date:*), Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(npm run build:*), mcp__supabase__list_tables, mcp__supabase__execute_sql, mcp__supabase__apply_migration
---

# /port-game — Portar un juego de referencia a Arcade Vault

## Session context

Hoy:
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "specs/ no existe todavía"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "references/started-games/ no existe"`

Juegos con motor real ya portados:
!`ls components/games/ 2>/dev/null || echo "components/games/ no existe todavía"`

---

Este skill sigue el mismo método spec-driven que `/spec` + `/spec-impl` (misma convención de `specs/`, mismo idioma), pero especializado: primero produce un spec del port (Fase 2), y solo tras aprobación explícita del usuario lo implementa (Fase 3). **No escribas código antes de que el spec esté aprobado.**

## Fase 0 — Reconocimiento

1. Determina qué carpeta de `references/started-games/` se va a portar (de `$ARGUMENTS` o preguntando si no viene). Lee su `game.js` completo, y cualquier archivo hermano (`levels.js`, `assets/*.js`). Inventaría assets binarios (imágenes, audio).
2. Lee `CLAUDE.md`/`AGENTS.md` del repo si no los tienes ya en contexto.
3. Lee los dos specs más recientes de `specs/` (probablemente `05-rocas-asteroids-juego-real.md` y `06-leaderboard-y-catalogo-supabase.md`) para el idioma, encabezados y nivel de detalle exactos a replicar.
4. Lee `reference.md` (en el mismo directorio que este SKILL.md) — es el playbook técnico completo: contratos de `lib/games/types.ts`, esqueletos anotados del motor y del componente, la tabla de ids de catálogo ya sembrados, y la lista de trampas ya resueltas. No lo resumas de memoria, léelo cada vez — puede haberse actualizado por un port anterior.
5. Confirma con `mcp__supabase__execute_sql` (`select id, title, cat, cover, color from games`) si el id de catálogo objetivo ya existe.
6. Comprueba si `lib/games/types.ts` y `lib/games/registry.ts` ya existen en el repo (deberían, tras el primer port). Si no existen, la Fase 3 los crea como primer paso.

## Fase 1 — Preguntas

Usa `AskUserQuestion` en bloques de 3 a 5. No asumas — cada pregunta de abajo puede cambiar archivos concretos del plan.

Preguntas que **siempre** hay que resolver (derivadas de las decisiones reales que tomó el spec 05):

- **Id de catálogo y título.** Si ya existe una fila que corresponde a este juego (ver tabla en `reference.md`), confírmalo; si no, pide id/título/categoría (`ARCADE|PUZZLE|SHOOTER|VERSUS`)/color (`cyan|magenta|green|yellow`)/cover.
- **Mapeo score/lives/level.** Si el juego original no tiene "vidas" (p. ej. Tetris) o tiene un concepto de nivel propio, ¿cómo se traduce a `ArcadeGameState`?
- **HUD interno del canvas.** ¿Se conserva tal cual (recomendado, como Asteroids) o se ajusta?
- **Overlays internos a eliminar.** Cuáles del original entran en conflicto con el modal/HUD de React (game over, pausa, reinicio por tecla) y se quitan.
- **Controles.** Cuáles se portan tal cual (teclado) y si se agrega algo (mouse/touch) — spec 05 dejó explícitamente táctil fuera de alcance por defecto.
- **Assets binarios y sonido**, si el juego los trae: ¿se portan o quedan fuera de alcance (como decidió spec 05 para Asteroids)?
- **Aspect ratio.** Si el juego original no es 4:3, ¿letterbox dentro de 800×600 o algo distinto? (`.crt-screen` es 4:3 compartido por todos los juegos, no se cambia por uno solo).

No avances a Fase 2 hasta poder responder sin inventar: qué archivos van a aparecer o cambiar, cuál es el primer y último paso ejecutable, y cómo se verifica que quedó terminado.

## Fase 2 — Escribir el spec

1. Usa `.agents/skills/port-game/template.md` (mismo directorio) como forma a seguir — no lo copies literal, especialízalo con los nombres reales del juego.
2. Numera el spec como el siguiente consecutivo de `specs/` (dos dígitos).
3. Fecha: la del session context de arriba, nunca inventada.
4. Estado inicial: `Draft`. **Nunca lo marques `Approved`/`Done` automáticamente.**
5. `**Depende de:** SPEC 05, SPEC 06`.
6. Escribe el archivo completo en `specs/NN-slug.md` de una vez (no sección por sección) si ya puedes responder las tres preguntas de cierre de Fase 1 sin asumir nada; si algo sigue sin resolverse, desarrolla sección por sección esperando confirmación como hace `/spec`.
7. **Detente aquí.** Anuncia la ruta del archivo y pide al usuario que lo revise y apruebe (cambie el estado a `Approved` o equivalente). No continúes a Fase 3 sin esa aprobación explícita en la conversación.

## Fase 3 — Implementar (solo con spec aprobado)

Sigue el playbook de `reference.md` al pie de la letra. En orden:

1. Si `specs/.spec-config.yml` tiene `AutoCreateBranch: true`, crea y cambia a la rama `spec-NN-slug`; si es `false`, pide confirmación primero (mismo comportamiento que `/spec-impl`).
2. Si `lib/games/types.ts` no existe, créalo (contrato exacto en `reference.md`).
3. Si `lib/games/registry.ts` no existe, créalo; si ya existe, solo le agregas una entrada al final del proceso.
4. `lib/games/<id>/engine.ts` — port del `game.js` original siguiendo el esqueleto y las reglas duras de `reference.md` (sin globals de módulo, listeners registrados en `start`/removidos en `stop`, `dt` clamp, HUD interno conservado, overlay de fin de partida eliminado).
5. `components/games/<Nombre>Game.tsx` — siguiendo el esqueleto de `reference.md` (dpr, refs, cleanup, reacción a `paused`).
6. Copia los assets binarios a `public/games/<id>/...` si aplica, y ajusta las rutas en el motor.
7. Agrega la entrada en `lib/games/registry.ts` (`ssr: false`).
8. Si el id de catálogo no existía, `mcp__supabase__apply_migration` con el `INSERT` exacto acordado en Fase 1/documentado en el spec. Si ya existía, no toques la tabla `games`.
9. `npm run build` — debe terminar sin errores de TypeScript/ESLint. Si falla, arregla antes de seguir.
10. Prueba manual: jugar una partida completa en `/juego/<id>/jugar` — controles, HUD real, PAUSA/REANUDAR, FIN, modal de fin con guardado, "JUGAR DE NUEVO", y que el puntaje aparezca en `/juego/<id>` y `/salon?game=<id>`.
11. Marca cada criterio de aceptación del spec y cambia su estado a `Done` (o el equivalente que usen los specs anteriores).

**Regla dura:** si en algún punto de la Fase 3 descubres que una decisión del spec no cubre un caso real del código fuente, para y pregunta — no la resuelvas en silencio ni la dejes para "después".

## Tono

Responde en el mismo idioma en que el usuario invocó el skill (normalmente español, como el resto del repo). No expliques de más lo que `reference.md`/`template.md` ya documentan — referéncialos.

## Argumentos

`$ARGUMENTS` puede traer `<carpeta-en-references/started-games>` (p. ej. `03-tetris`) y opcionalmente el id de catálogo deseado. Si viene vacío, pregunta en Fase 0 cuál de las carpetas listadas en el session context se quiere portar.
