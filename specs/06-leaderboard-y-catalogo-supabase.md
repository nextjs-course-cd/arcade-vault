# SPEC 06 — Leaderboard y catálogo de juegos reales en Supabase

> **Estado:** Done
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-08-22
> **Objetivo:** Migrar el catálogo de juegos (`GAMES`) y los puntajes (Salón de la Fama, detalle de juego, guardado al perder) de datos falsos (`seededScores`, array estático, `localStorage`) a dos tablas reales en Supabase (`games`, `scores`), leídas desde Server Components y escritas mediante una Server Action.

## Por qué existe este spec

El spec 04 instaló el cliente de Supabase pero dejó explícitamente pendiente "migrar puntajes a una tabla real" y "migrar el catálogo de juegos a una tabla real". El spec 05 implementó Asteroids con guardado real de puntaje, pero en `localStorage`, no en Supabase. Hoy el Salón de la Fama y el detalle de cada juego muestran rankings 100% inventados (`seededScores`) que no reflejan ninguna partida real. Este spec cierra esas dos migraciones a la vez porque comparten el mismo cambio de patrón (Server Components leyendo Supabase) y porque la tabla `scores` depende de que `games` ya exista (foreign key).

## Alcance

**Incluye:**

- Tabla `games` en Supabase (catálogo), sembrada con los 8 juegos que hoy están en `GAMES` (`lib/data.ts`), sin las columnas `best`/`plays` (se calculan en vivo desde `scores`).
- Tabla `scores` en Supabase (puntajes), con RLS: lectura pública en ambas tablas, inserción pública únicamente en `scores`. Incluye columna `user_id` (nullable, `uuid`, sin foreign key todavía — no hay tabla de usuarios real hasta el spec de Auth) para no tener que alterar el esquema cuando llegue auth real; se guarda `null` en todos los inserts de este spec. `name` sigue siendo obligatorio (`not null`), igual que hoy: es lo único que identifica al jugador mientras no haya auth.
- `lib/games.ts`: tipos (`Game`, `GameCategory`, `GameColor`, `GameWithStats`, `CATS`/`Cat`) y funciones de lectura server-side (`getGames()`, `getGameById(id)`) que calculan `best` (máximo score o `null`) y `plays` (conteo de partidas) a partir de `scores`.
- `lib/scores.ts`: tipo `ScoreRow` y `getTopScores(gameId, limit)` (lectura server-side, ordenado por score descendente).
- `lib/actions/scores.ts`: Server Action `saveScore(gameId, name, score)` que inserta en `scores` usando el cliente server de Supabase, con `user_id: null` (no hay sesión real que leer todavía).
- Conversión a Server Component (fetch en el servidor) de las partes estáticas de: `app/juegos/page.tsx`, `app/juego/[id]/page.tsx`, `app/salon/page.tsx`, `app/page.tsx` (sección de preview de juegos). Lo interactivo de cada una pasa a un Client Component chico que recibe los datos ya resueltos como props:
  - `components/GamesBrowser.tsx` (buscador + chips de categoría + grilla, hoy inline en `app/juegos/page.tsx`).
  - Sección "TU MEJOR MARCA" del Salón de la Fama, que depende de `useAuth()` (contexto de cliente), aislada en un componente cliente chico.
  - Selector de juego del Salón de la Fama implementado como tabs de navegación (`<Link href="?game=id">`), no como estado de cliente — la página server-rendea según `searchParams.game`.
- `app/juego/[id]/jugar/page.tsx` sigue siendo Client Component (por la interacción de juego), pero reemplaza `saveScore`/`localStorage.setItem("av_scores", …)` por una llamada a la Server Action `saveScore` de `lib/actions/scores.ts`.
- Eliminar de `lib/data.ts`: `GAMES`, `seededScores`, `PLAYERS`, `ScoreRow`, `Game`, `GameCategory`, `GameColor`, `CATS`/`Cat` (todo se reemplaza por `lib/games.ts`/`lib/scores.ts`). Actualizar los 6 archivos que hoy importan de `@/lib/data` (`app/page.tsx`, `app/salon/page.tsx`, `app/juegos/page.tsx`, `app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx`, `components/GameCard.tsx`).
- Juegos sin puntajes reales (todos menos Asteroids, hasta que se porten) muestran un estado vacío explícito ("Sé el primero en anotar" / `best: null`, `plays: 0`) — no se siembra ningún dato falso en `scores`.
- Verificación: `npm run build` sin errores, y prueba manual en navegador jugando una partida de Asteroids, perdiendo, guardando el puntaje, y viéndolo reflejado en `/juego/asteroids` y `/salon?game=asteroids`.

**Fuera de alcance (para specs futuros):**

- Autenticación real. `scores.user_id` se agrega como columna en este spec (para no tener que migrar el esquema después) pero se guarda siempre `null` — poblarla con el usuario real es un spec futuro de Auth.
- Portar el resto de los juegos (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) a lógica real — siguen con el mock decorativo de `app/juego/[id]/jugar/page.tsx`; simplemente ya no falsifican un guardado real de puntaje en Supabase (nunca lo hicieron).
- Rate limiting / anti-spam sobre el insert público de `scores`. El riesgo de que cualquiera inserte puntajes falsos ya existe hoy (localStorage editable por el usuario) y no empeora funcionalmente, pero ahora es visible para todos globalmente; se documenta como riesgo, no se mitiga en este spec.
- Migración de un editor de administración para `games` (altas/bajas/ediciones del catálogo vía UI). La tabla se siembra por SQL en este spec; cualquier cambio futuro al catálogo se hace por migración, no por una pantalla de admin.
- Refactor del reveal/scroll de `app/page.tsx` más allá de lo necesario para separar el fetch de `games` del resto del contenido cliente.

## Modelo de datos

Migración SQL (vía `apply_migration`):

```sql
create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan', 'magenta', 'green', 'yellow')),
  created_at timestamptz not null default now()
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  user_id uuid, -- nullable: sin auth real todavía; se puebla en el spec de Auth
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table public.games enable row level security;
alter table public.scores enable row level security;

create policy "games_public_read" on public.games for select using (true);
create policy "scores_public_read" on public.scores for select using (true);
create policy "scores_public_insert" on public.scores for insert with check (true);
```

`games` se llena en la misma migración con un `insert` por cada uno de los 8 juegos actuales de `GAMES` (mismos `id`, `title`, `short`, `long`, `cat`, `cover`, `color`). `scores` arranca vacía — no se siembra nada falso.

Tipos TypeScript (`lib/games.ts`):

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
}

export interface GameWithStats extends Game {
  best: number | null; // null si nadie ha guardado un puntaje real
  plays: number; // 0 si no hay partidas guardadas
}
```

Tipo (`lib/scores.ts`):

```ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // formateado a partir de created_at
}
```

## Plan de implementación

1. **Migración SQL.** Crear `games` y `scores` con las policies de RLS de arriba, y sembrar `games` con los 8 registros actuales de `GAMES`. Verificar con `list_tables` que ambas existen y `games` tiene 8 filas.
2. **`lib/games.ts`.** Tipos (`Game`, `GameCategory`, `GameColor`, `GameWithStats`, `CATS`, `Cat`) y funciones `getGames(): Promise<GameWithStats[]>` / `getGameById(id: string): Promise<GameWithStats | null>`, usando `lib/supabase/server.ts`, calculando `best`/`plays` por juego a partir de `scores`.
3. **`lib/scores.ts`.** `getTopScores(gameId: string, limit: number): Promise<ScoreRow[]>`, lectura server-side ordenada por `score` descendente.
4. **`lib/actions/scores.ts`.** Server Action (`"use server"`) `saveScore(gameId: string, name: string, score: number): Promise<void>` que inserta una fila en `scores` (con `user_id: null`) con `lib/supabase/server.ts`.
5. **`app/juegos/page.tsx` → Server Component.** Hace `await getGames()` y renderiza `components/GamesBrowser.tsx` (nuevo Client Component) pasándole `games` como prop; `GamesBrowser` mantiene el buscador, los chips de categoría y la grilla (`GameCard`) que hoy vive inline en la página.
6. **`app/juego/[id]/page.tsx` → Server Component.** Recibe `params` como `Promise` (`await`), hace `await getGameById(id)` y `await getTopScores(id, 10)`; si `game` es `null`, `notFound()`. El leaderboard lateral muestra estado vacío ("Sé el primero en anotar") cuando `scores.length === 0`. El botón "JUGAR AHORA" pasa a `<Link>`.
7. **`app/salon/page.tsx` → Server Component con tabs por `searchParams`.** Recibe `searchParams.game` (Promise, `await`), usa el primer juego de `getGames()` como default si no viene. Hace `await getTopScores(gameId, 12)` para el juego seleccionado. Los tabs son `<Link href="/salon?game=ID">`, no estado de cliente. Extrae la fila "TU MEJOR MARCA" (que depende de `useAuth()`) a un Client Component chico (`components/YourBestScore.tsx` o similar) que recibe `gameId` y el resto de filas ya resueltas.
8. **`app/page.tsx`: separar preview de juegos.** Crear un wrapper server (`app/page.tsx` async) que hace `await getGames()` y pasa `games.slice(0, 6)` a un Client Component (el contenido actual completo, renombrado p. ej. `components/HomeContent.tsx`) que conserva el `useReveal`/`IntersectionObserver` y todo el resto tal cual.
9. **`app/juego/[id]/jugar/page.tsx`: guardar puntaje real.** Reemplazar `saveScore`/`localStorage.setItem("av_scores", …)` por `await saveScore(game.id, name, score)` importado de `lib/actions/scores.ts`. Actualizar el import de `GAMES` a `getGameById`/`getGames` de `lib/games.ts` (la página sigue siendo Client Component; puede recibir el juego resuelto como prop desde un wrapper server si hace falta, o seguir buscándolo en un array pasado por prop — sin volver a un array estático global).
10. **Limpieza de `lib/data.ts`.** Eliminar `GAMES`, `seededScores`, `PLAYERS`, `ScoreRow`, `Game`, `GameCategory`, `GameColor`, `CATS`/`Cat` (o borrar el archivo si queda vacío) y actualizar `components/GameCard.tsx` para importar `Game`/`GameWithStats` desde `lib/games.ts`.
11. **Verificación final.** `npm run build` sin errores de TypeScript/ESLint. Prueba manual: `/juegos` lista los 8 juegos reales con búsqueda/filtro funcionando; `/juego/asteroids` muestra el leaderboard vacío si no hay partidas o las partidas reales si ya las hay; jugar una partida en `/juego/asteroids/jugar`, perder, guardar puntaje; confirmar que aparece en `/juego/asteroids` y en `/salon?game=asteroids`; confirmar que otro juego (p. ej. `/juego/serpentina`) muestra el estado vacío ("Sé el primero en anotar").

## Criterios de aceptación

- [x] Existen las tablas `games` y `scores` en Supabase, con RLS habilitado y las policies descritas (select público en ambas, insert público solo en `scores`).
- [x] `games` tiene 8 filas (una por cada juego actual), sin columnas `best`/`plays` fijas.
- [x] `/juegos` carga la lista de juegos desde Supabase (no desde un array estático) y el buscador + filtro de categoría siguen funcionando.
- [x] `/juego/[id]` es un Server Component que resuelve `params` como Promise, muestra `best`/`plays` calculados en vivo, y el botón "JUGAR AHORA" navega a `/juego/[id]/jugar`.
- [x] Un juego sin partidas guardadas muestra un estado vacío explícito en vez de un ranking inventado.
- [x] `/salon` cambia de juego vía navegación (`?game=id`) sin recargar todo el estado de cliente, y el ranking mostrado corresponde a partidas reales de `scores`.
- [x] Jugar una partida de Asteroids y perder guarda el puntaje en la tabla `scores` de Supabase (verificable por SQL), no en `localStorage`.
- [x] El puntaje recién guardado aparece en `/juego/asteroids` y en `/salon?game=asteroids` sin necesidad de sembrar datos falsos.
- [x] `scores` tiene columna `user_id` (`uuid`, nullable) y `name` sigue siendo `not null`; todos los inserts de este spec guardan `user_id: null`.
- [x] `lib/data.ts` ya no exporta `GAMES`, `seededScores`, `PLAYERS` ni `ScoreRow`.
- [x] `npm run build` termina sin errores de TypeScript ni ESLint.

## Decisiones tomadas y descartadas

- **Un solo spec para `games` + `scores`** — decisión explícita del usuario: ambas migraciones se hacen juntas porque `scores` depende de `games` (foreign key) y comparten el mismo cambio de patrón de lectura.
- **Estado vacío en vez de sembrar datos falsos en `scores`** — se descarta migrar `seededScores` como filas iniciales porque perpetuaría datos inventados en una tabla que se supone real; un juego sin partidas simplemente no tiene ranking todavía.
- **Supabase como única fuente de `games`** (se elimina `lib/data.ts#GAMES`) — se descarta mantenerlo como fallback porque introduciría dos fuentes de verdad divergentes; si Supabase falla, la página falla (no hay tolerancia a fallos definida en este spec).
- **`best`/`plays` calculados en vivo desde `scores`** — se descartan como columnas fijas en `games` porque quedarían desincronizadas de los puntajes reales apenas alguien juegue.
- **`user_id` nullable en `scores` desde ya, sin FK** — decisión explícita del usuario: se agrega la columna ahora (siempre `null` en este spec) para no tener que alterar el esquema cuando llegue el spec de Auth; se descarta agregar una foreign key a `auth.users` porque no hay tabla de usuarios real todavía. `name` sigue siendo `not null` porque es lo único que identifica al jugador mientras no haya auth.
- **Server Components por defecto, Client Components solo para lo interactivo** (`GamesBrowser`, la fila "tu mejor marca", el juego jugable) — decisión explícita del usuario, evita fetch en el cliente y loading spinners para contenido que es igual para todos los visitantes.
- **Tabs del Salón de la Fama como `<Link href="?game=id">` en vez de estado de cliente** — permite que la página siga siendo Server Component (recalcula `searchParams` en cada navegación) en vez de convertir todo el Salón en Client Component solo por el cambio de tab.
- **Guardado de puntaje vía Server Action (`lib/actions/scores.ts`)** — decisión explícita del usuario, en vez de insert directo desde el cliente con `supabase-js` o un route handler; mantiene la escritura del lado servidor sin agregar un endpoint HTTP nuevo.
- **RLS: select público en ambas tablas, insert público solo en `scores`** — recomendación aceptada; `games` no acepta insert/update/delete públicos (se llena solo por migración), `scores` acepta insert público porque no hay auth real todavía (mismo nivel de confianza que `localStorage` hoy, pero ahora compartido globalmente).

## Riesgos identificados

| Riesgo                                                                                                                             | Mitigación                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scores_public_insert` permite que cualquiera inserte puntajes falsos sin límite (sin auth, sin rate limit)                        | Aceptado como riesgo conocido para este spec — el nivel de confianza es igual al de `localStorage` hoy (el usuario ya podía editarlo a mano), pero ahora es visible globalmente. Se revisita cuando exista un spec de Auth real. |
| Eliminar `lib/data.ts#GAMES` rompe cualquier import no detectado                                                                   | Se verificó por grep que solo 6 archivos importan de `@/lib/data` (listados en el Alcance); todos se actualizan en este spec.                                                                                                    |
| `params`/`searchParams` como `Promise` en Server Components (Next.js 16) mal manejados                                             | Seguir el patrón de `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md` (`async function Page({ params })` con `await params`) en cada página convertida.                                |
| Separar `app/page.tsx` en server+client puede romper el `useReveal`/`IntersectionObserver` si se corta mal el árbol de componentes | El contenido cliente se mueve completo (sin dividir su JSX) a un solo Client Component nuevo que recibe `games` ya resuelto como prop; no se reescribe la lógica de reveal.                                                      |

## Qué no incluye este spec

- Autenticación real / poblar `scores.user_id` con el usuario real — spec futuro.
- Portar el resto de los juegos a lógica real — cada uno en su propio spec, como ya estableció el spec 05.
- Rate limiting o moderación sobre el insert público de `scores`.
- Panel de administración para editar `games` desde la UI.

Cada uno de estos, si se implementa, va en su propio spec.
