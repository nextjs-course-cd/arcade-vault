# TODO — Sugerencias de juegos para Arcade Vault

Memoria persistente del agente `game-planner`. **No borrar filas** — mover de
estado y anotar la razón. Estados: `Sugerido` → `Aprobado` → `En curso` → `Hecho`,
o `Descartado`.

Última actualización: 2026-08-23

## Pendientes

- [ ] Duelo Pixel (`duelo-pixel`, VERSUS) — recomendación principal, confirmar mecánica 1P-vs-IA antes de `/spec`.
- [ ] Ping Neón (`ping-neon`, VERSUS) — Pong 1P vs IA, motor más barato de los 20, muy CRT.
- [ ] Glotón (`gloton`, ARCADE) — alternativa segura, tipo Pac-Man, fila ya reservada.
- [ ] Serpentina (`serpentina`, ARCADE) — Snake, fila ya reservada, motor trivial.
- [ ] Ranaria (`ranaria`, ARCADE) — Frogger, fila ya reservada.
- [ ] Invasores (`invasores`, SHOOTER) — alternativa, tipo Space Invaders, fila ya reservada.
- [ ] Empuja Cajas (`empuja-cajas`, PUZZLE) — Sokoban, mejor mapeo de contrato del lote PUZZLE.

## Historial

| Juego              | id                | cat     | Estado   | Fecha      | Nota                                                                                                       |
| ------------------ | ----------------- | ------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| Asteroids          | `asteroids`       | SHOOTER | Hecho    | 2026-08-22 | spec 05, motor real en `lib/games/asteroids/`                                                              |
| Tetris             | `caida`           | PUZZLE  | Hecho    | 2026-08-22 | spec 07, motor real en `lib/games/caida/`                                                                  |
| Arkanoid           | `bloque-buster`   | ARCADE  | Hecho    | 2026-08-22 | spec 08, motor real en `lib/games/bloque-buster/`                                                          |
| Duelo Pixel        | `duelo-pixel`     | VERSUS  | Sugerido | 2026-08-23 | única cat sin motor real ni cubierta por real; requiere validar modo 1P-vs-IA con score único              |
| Glotón             | `gloton`          | ARCADE  | Sugerido | 2026-08-23 | fila ya en Supabase, mecánica tipo Pac-Man, contrato limpio, cat ARCADE ya cubierta por bloque-buster      |
| Invasores          | `invasores`       | SHOOTER | Sugerido | 2026-08-23 | fila ya en Supabase, mecánica tipo Space Invaders, cat SHOOTER ya cubierta por asteroids                   |
| Escuadrón          | `escuadron`       | SHOOTER | Sugerido | 2026-08-23 | tipo Galaga, formación+captura, distinto de Invasores pero mismo género, motor desde cero                  |
| Comando Misil      | `comando-misil`   | SHOOTER | Sugerido | 2026-08-23 | tipo Missile Command, input apuntar-y-disparar (revisar si contrato asume solo teclado), muy vectorial/CRT |
| Ciempiés           | `ciempies`        | SHOOTER | Sugerido | 2026-08-23 | tipo Centipede, arena libre + terreno destructible, complejidad media                                      |
| Interceptor        | `interceptor`     | SHOOTER | Sugerido | 2026-08-23 | tipo Defender/Scramble, scroll horizontal continuo, el más costoso de motor de los SHOOTER                 |
| Empuja Cajas       | `empuja-cajas`    | PUZZLE  | Sugerido | 2026-08-23 | tipo Sokoban, mejor mapeo de contrato del lote (level=sala, score=sala-pasos extra)                        |
| Tubería Neón       | `tuberia-neon`    | PUZZLE  | Sugerido | 2026-08-23 | tipo Pipe Mania, mapeo limpio, motor con pathfinding de flujo en tiempo real, muy neón                     |
| Gemas Neón         | `gemas-neon`      | PUZZLE  | Sugerido | 2026-08-23 | tipo Match-3/Bejeweled, mapeo de `lives` forzado (sin vidas naturales), estética fuerte                    |
| Fusión 2048        | `fusion-2048`     | PUZZLE  | Sugerido | 2026-08-23 | tipo 2048, `lives` decorativo (siempre 1), aporta poca identidad visual arcade                             |
| Campo Minado       | `campo-minado`    | PUZZLE  | Sugerido | 2026-08-23 | tipo Buscaminas, peor encaje visual CRT/neón y mapeo de vidas forzado del lote                             |
| Serpentina         | `serpentina`      | ARCADE  | Sugerido | 2026-08-23 | fila ya en Supabase, tipo Snake, motor trivial, mejor encaje de contrato del lote ARCADE                   |
| Ranaria            | `ranaria`         | ARCADE  | Sugerido | 2026-08-23 | fila ya en Supabase, tipo Frogger, complejidad media (colisión multi-carril)                               |
| Cavador            | `cavador`         | ARCADE  | Sugerido | 2026-08-23 | tipo Dig Dug, terreno destructible, sin fila en Supabase, aporta mecánica genuinamente nueva               |
| Saltacubos         | `saltacubos`      | ARCADE  | Sugerido | 2026-08-23 | tipo Q*bert, render isométrico, sin fila en Supabase, el más complejo de motor del lote ARCADE             |
| Ping Neón          | `ping-neon`       | VERSUS  | Sugerido | 2026-08-23 | tipo Pong 1P vs IA, motor más barato de los 20, encaje CRT vectorial máximo                                |
| Duelo del Oeste    | `duelo-oeste`     | VERSUS  | Sugerido | 2026-08-23 | duelo de reacción por tiempo contra IA, motor muy simple (timers + input)                                  |
| Ring de Neón       | `ring-neon`       | VERSUS  | Sugerido | 2026-08-23 | tipo Punch-Out simplificado, el más costoso de motor de los VERSUS (animación de personaje)                |
| Combate de Tanques | `combate-tanques` | VERSUS  | Sugerido | 2026-08-23 | tipo Atari Combat 1P vs IA, física de rebote + line-of-sight simple, estética vectorial fuerte             |

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
