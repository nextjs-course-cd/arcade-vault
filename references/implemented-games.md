# Juegos de Arcade Vault

Inventario de los juegos del catálogo (tabla `games` de Supabase) y su estado de
implementación real. Un juego está **jugable** cuando tiene motor propio y una
entrada en `lib/games/registry.ts`; el resto cae al placeholder animado de
`components/GamePlayer.tsx` con puntuación simulada.

Consultado el 2026-08-23.

## Resumen

| Estado                | Cantidad |
| --------------------- | -------- |
| Jugables (motor real) | 3        |
| Solo catálogo         | 5        |
| **Total**             | **8**    |

## Jugables (motor real)

| Id              | Título        | Categoría | Color   | Portada        | Spec                                            |
| --------------- | ------------- | --------- | ------- | -------------- | ----------------------------------------------- |
| `asteroids`     | ROCAS         | SHOOTER   | yellow  | `cover-rocas`  | `specs/05-rocas-asteroids-juego-real.md`        |
| `caida`         | CAÍDA         | PUZZLE    | magenta | `cover-tetro`  | `specs/07-caida-tetris-juego-real.md`           |
| `bloque-buster` | BLOQUE BUSTER | ARCADE    | cyan    | `cover-bricks` | `specs/08-bloque-buster-arkanoid-juego-real.md` |

### ROCAS (`asteroids`)

- **Pitch:** Pulveriza asteroides en gravedad cero.
- **Descripción:** Tu nave triangular flota en vacío absoluto. Dispara y rota para
  dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el
  horizonte.
- **Motor:** `lib/games/asteroids/engine.ts`
- **Componente:** `components/games/AsteroidGame.tsx`
- **Assets:** ninguno (todo dibujado por canvas).
- **Marcadores:** 1 partida guardada, mejor puntuación 220.

### CAÍDA (`caida`)

- **Pitch:** Encaja las piezas antes de que el techo te aplaste.
- **Descripción:** Piezas geométricas descienden desde la oscuridad. Rótalas,
  encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad
  cada 10 líneas.
- **Motor:** `lib/games/caida/engine.ts`
- **Componente:** `components/games/CaidaGame.tsx`
- **Assets:** ninguno.
- **Marcadores:** 1 partida guardada, mejor puntuación 446.

### BLOQUE BUSTER (`bloque-buster`)

- **Pitch:** Rebota la pelota y destruye muros de neón.
- **Descripción:** Pilota una nave-paleta y rebota un núcleo de plasma para
  pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en
  patrones imposibles. ¿Hasta dónde llegará tu racha?
- **Motor:** `lib/games/bloque-buster/engine.ts`
- **Componente:** `components/games/BloqueBusterGame.tsx`
- **Assets:** `public/games/bloque-buster/` (spritesheets y audio).
- **Marcadores:** 1 partida guardada, mejor puntuación 380.

## Solo catálogo (pendientes de portar)

Aparecen en `/juegos` y tienen ficha en `/juego/[id]`, pero al pulsar JUGAR usan
el placeholder porque no están en el registry.

| Id            | Título      | Categoría | Color  | Portada          | Pitch                                      |
| ------------- | ----------- | --------- | ------ | ---------------- | ------------------------------------------ |
| `duelo-pixel` | DUELO PIXEL | VERSUS    | cyan   | `cover-duelo`    | Dos paletas. Una pelota. Reflejos máximos. |
| `gloton`      | GLOTÓN      | ARCADE    | yellow | `cover-glot`     | Devora puntos y escapa de los fantasmas.   |
| `invasores`   | INVASORES   | SHOOTER   | green  | `cover-invaders` | Defiende el planeta de filas alienígenas.  |
| `ranaria`     | RANARIA     | ARCADE    | green  | `cover-rana`     | Cruza la autopista de pixeles.             |
| `serpentina`  | SERPENTINA  | ARCADE    | green  | `cover-snake`    | Crece sin morder tu propia cola.           |

## Cómo se porta un juego nuevo

Con el skill `/port-game`: primero el spec en `specs/NN-slug.md`, y tras la
aprobación explícita las tres piezas del contrato de `lib/games/types.ts`:

1. `lib/games/<id>/engine.ts` — motor vanilla con todo el estado en la closure.
2. `components/games/<Nombre>Game.tsx` — canvas 800×600 `"use client"`.
3. Una línea en `lib/games/registry.ts`.
