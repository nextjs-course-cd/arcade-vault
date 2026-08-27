---
name: spec-impl-game
description: Implementa un spec de juego aprobado siguiendo el mismo flujo de /spec-impl y, al terminar, encadena los agentes skin-designer y mobile-porter en ese orden (nunca en paralelo).
disable-model-invocation: true
argument-hint: <NN-spec-name>
allowed-tools: Read, Glob, Grep, Edit, Write, Task, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*), Bash(npm run build:*), Bash(npm run lint:*)
---

# /spec-impl-game — Implementador de specs de juego + skins + mobile

Es `/spec-impl` con dos agentes encadenados al final: cuando el plan del spec queda
implementado, lanza `skin-designer` sobre el id del juego recién portado y, solo cuando
ese agente termina, lanza `mobile-porter` sobre la ruta del reproductor. Los dos agentes
van **siempre en secuencia, nunca en paralelo** — `skin-designer` toca el HUD de
`components/GamePlayer.tsx` y `mobile-porter` audita ese mismo HUD ya terminado.

## Session context

Current repository state:
!`git status --short`

Current branch:
!`git branch --show-current`

Specs available in this folder:
!`ls specs/ 2>/dev/null || echo "The specs/ folder does not exist"`

Specs anidados de game-jam:
!`find specs/game-jam -mindepth 2 -maxdepth 2 -name '*.md' 2>/dev/null || echo "No hay specs de game-jam"`

Branch-creation config:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, no config file)"`

Juegos ya registrados:
!`cat lib/games/registry.ts 2>/dev/null`

---

## Instrucciones

### Fases 1 a 4 — igual que /spec-impl

Lee completo `.claude/skills/spec-impl/SKILL.md` con la herramienta Read y ejecuta sus
Fases 1 a 4 al pie de la letra, usando `$ARGUMENTS` como argumento: identificar el spec,
validar que su estado significa "Approved" (o el bloqueo estándar si no), crear/cambiar a
la rama `spec-NN-slug` según `AutoCreateBranch`, mostrar el resumen del spec, y luego
implementar paso a paso con pausa de revisión de diff después de cada paso. No lo invoques
con la herramienta Skill — tiene `disable-model-invocation: true`; esto es "leer y
ejecutar", no una llamada anidada.

Dos ajustes propios de este comando sobre esa base:

1. **Búsqueda del spec (Fase 1):** además de `specs/`, busca también en
   `specs/game-jam/<juego>/` (ya listado en el contexto de sesión arriba). El usuario
   puede referirse a un spec anidado por su slug o número igual que a uno de nivel
   superior.
2. **Nombre de rama para un spec anidado:** se deriva igual que siempre, del nombre del
   archivo sin extensión y sin la ruta de carpetas — ej.
   `specs/game-jam/ranaria/01-ranaria-cruce-de-carriles.md` → rama
   `spec-01-ranaria-cruce-de-carriles`.

Si la Fase 2 bloquea (estado no-Approved) o el usuario aborta en cualquier punto de las
Fases 1-4: **el comando termina ahí. No se lanza ningún agente.**

### Fase 5 — Resolver el id de catálogo del juego

Solo al completar el último paso del plan de implementación:

1. Lee `lib/games/registry.ts` y compáralo contra el listado de "Juegos ya registrados"
   del contexto de sesión de arriba — identifica la clave nueva que agregó esta
   implementación.
2. Cruza esa clave con el título/slug del spec para confirmar que corresponde.
3. Si no hay ninguna clave nueva en el registry (el spec no era un port de juego, o el
   registro quedó pendiente), detente aquí, dilo explícitamente y **no lances
   `skin-designer`** — este flujo de dos agentes solo aplica a specs que portan un juego
   jugable.

### Fase 6 — skin-designer (con confirmación, primero)

Pregunta antes de lanzar nada:

```
✅ Plan implementado.
Siguiente: skin-designer sobre `<id>` (skins clásico / neón / retro).
¿Lo lanzo? [s/N]
```

- Si el usuario dice que no o pide esperar: detente, no lances ningún agente, deja el
  resto para que el usuario lo pida manualmente cuando quiera.
- Si dice que sí: lanza `Task` con `subagent_type: "skin-designer"` y como prompt el id de
  catálogo confirmado en la Fase 5. **Espera a que ese Task termine por completo** antes
  de continuar — no sigas de largo ni lances el siguiente agente en el mismo turno.

Cuando termine, relata al usuario su salida final tal como la reportó el agente
(archivos creados/modificados, roles de color detectados, si la infraestructura
compartida ya existía, resultado de `npm run build`).

### Fase 7 — mobile-porter (con confirmación, solo después de que skin-designer terminó)

Nunca antes de que el Task de skin-designer haya devuelto su resultado. Pregunta:

```
skin-designer terminó. Siguiente: mobile-porter sobre /juego/<id>/jugar.
¿Lo lanzo? [s/N]
```

- Si el usuario dice que no: detente ahí, el flujo queda en manos del usuario para
  correrlo después.
- Si dice que sí: lanza `Task` con `subagent_type: "mobile-porter"` y como prompt la ruta
  `/juego/<id>/jugar` (alcance fijo de este comando: solo el reproductor, que es la ruta
  que cambia con un spec de juego — no "toda la app").

Cuando termine, relata su salida final (hallazgos del checklist con archivo:línea, ruta
del spec `Draft` que creó o si la ruta ya cumplía y no creó ninguno, archivos modificados,
resultado de `npm run build` + `npm run lint`).

**Regla dura:** las dos llamadas a `Task` van en mensajes/turnos separados, cada una
después de confirmar que la anterior terminó. Nunca lances los dos agentes en la misma
respuesta ni en paralelo.

### Cierre

Termina con un resumen: spec implementado, rama activa, qué hizo cada uno de los dos
agentes (o cuáles se omitieron por decisión del usuario), y el mismo recordatorio de
`/spec-impl`: verificar los criterios de aceptación del spec original uno por uno y, si
todos pasan, actualizar el estado del spec a mano y hacer el commit final antes de
mergear — nunca marques un spec como `Approved` ni `Done` por tu cuenta.

## Reglas duras

- Todo lo que dice `/spec-impl` sobre no commitear automáticamente, no improvisar ante
  ambigüedades del spec, y no salirse del alcance del spec, aplica igual aquí durante las
  Fases 1-4.
- Los agentes `skin-designer` y `mobile-porter` se lanzan siempre en ese orden y siempre
  secuenciales — nunca en paralelo, nunca invertidos.
- Si Fase 5 no encuentra un id de catálogo nuevo, no se lanza ningún agente — este comando
  no fuerza skins ni auditoría mobile sobre specs que no son ports de juego.
- Cada agente se lanza solo tras confirmación explícita del usuario (`[s/N]`), nunca de
  forma automática.
- Todo texto de UI y mensajes al usuario van en español.
