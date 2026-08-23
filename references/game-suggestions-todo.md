# TODO — Sugerencias de juegos para Arcade Vault

Memoria persistente del agente `game-planner`. **No borrar filas** — mover de
estado y anotar la razón. Estados: `Sugerido` → `Aprobado` → `En curso` → `Hecho`,
o `Descartado`.

Última actualización: 2026-08-23

## Pendientes

- [ ] _(vacío — corre el agente `game-planner` para llenar)_

## Historial

| Juego     | id              | cat     | Estado | Fecha      | Nota                                              |
| --------- | --------------- | ------- | ------ | ---------- | ------------------------------------------------- |
| Asteroids | `asteroids`     | SHOOTER | Hecho  | 2026-08-22 | spec 05, motor real en `lib/games/asteroids/`     |
| Tetris    | `caida`         | PUZZLE  | Hecho  | 2026-08-22 | spec 07, motor real en `lib/games/caida/`         |
| Arkanoid  | `bloque-buster` | ARCADE  | Hecho  | 2026-08-22 | spec 08, motor real en `lib/games/bloque-buster/` |

## Catálogo sin motor real (placeholder en `GamePlayer`)

Filas ya en la tabla `games` de Supabase pero sin componente en
`lib/games/registry.ts` — cuentan como categoría ocupada y son candidatos
directos a port antes que una idea nueva.

| Juego       | id            | cat     | color  |
| ----------- | ------------- | ------- | ------ |
| Duelo Pixel | `duelo-pixel` | VERSUS  | cyan   |
| Glotón      | `gloton`      | ARCADE  | yellow |
| Invasores   | `invasores`   | SHOOTER | green  |
| Ranaria     | `ranaria`     | ARCADE  | green  |
| Serpentina  | `serpentina`  | ARCADE  | green  |

## Descartados

_(ninguno todavía)_
