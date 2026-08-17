# 01 — Arcade Vault MVP Visual

**Estado:** Done
**Depende de:** —
**Fecha:** 2026-08-17

**Objetivo:** Implementar la capa visual completa de Arcade Vault (biblioteca, detalle de juego, reproductor decorativo, salón de la fama y autenticación) portando los templates de `references/templates/` a Next.js App Router + TypeScript + Tailwind v4, sin implementar lógica de juego real.

## Alcance

**Incluye:**

- 5 pantallas: Biblioteca (`/`), Detalle de juego (`/juego/[id]`), Reproductor (`/juego/[id]/jugar`), Salón de la Fama (`/salon`), Autenticación (`/auth`).
- Componente `Nav` (header + panel móvil) presente en todas las rutas vía `app/layout.tsx`.
- Footer global.
- Catálogo mock de 8 juegos, lista de jugadores y generador `seededScores`, portados de `data.jsx` a `lib/data.ts` con tipos TS.
- Login/registro/invitado **fake**: cualquier valor de usuario entra sin validar contra backend. Persistido en `localStorage` (`av_user`).
- Guardado de puntuaciones al terminar una partida decorativa, persistido en `localStorage` (`av_scores`).
- Pantalla reproductor con simulación decorativa: score auto-incremental vía `setInterval`, HUD (vidas, nivel, pausa, fin), pantalla CRT con naves/enemigos estáticos por CSS. Es ambientación visual, no un juego jugable.
- Botones sociales (Google/GitHub) en Auth: decorativos, sin handler.
- Theming Tailwind v4 (`@theme` en `globals.css`) con paleta neón/CRT, fuentes pixel/mono, y componentes de estilo (`.btn`, `.chip`, `.card`, `.crt`, etc.) portados de `styles.css`.
- Navegación entre pantallas vía App Router (`next/navigation`, `<Link>`, `useRouter`).

**No incluye (fuera de este spec):**

- Lógica real de ningún minijuego (Bloque Buster, Caída, Serpentina, etc.) — solo la pantalla contenedora decorativa.
- Backend/API de autenticación, base de datos, o validación de credenciales.
- Tabla de puntuaciones real/global compartida entre usuarios (sigue siendo mock generado con seed).
- Server Components / data fetching desde servidor — todo es client-side con datos estáticos importados.
- Tests automatizados.
- Internacionalización (queda todo en español, igual que el template).

## Modelo de datos

Todo vive en `lib/data.ts` (mock estático, sin base de datos) más dos claves de `localStorage`:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string; // clase CSS de fondo (cover-bricks, cover-tetro, ...)
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export const PLAYERS: string[];

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/aaaa
}
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Persistencia en `localStorage` (mismas claves que el template):

- `av_user`: `{ name: string } | null`
- `av_scores`: `Array<{ game: string; score: number; name: string; at: number }>`

## Plan de implementación

1. **Setup Tailwind v4 + tema.** Definir en `app/globals.css` las variables de `@theme` (colores neón cian/magenta/amarillo/verde/oro, fondo CRT, fuente pixel + mono) portando las custom properties de `styles.css`. Verificar contra `node_modules/next/dist/docs/01-app` que la config de Tailwind v4 con Next 16 no requiera `tailwind.config` adicional.
2. **Datos mock.** Crear `lib/data.ts` con `GAMES`, `CATS`, `PLAYERS`, `seededScores` tipados, portados 1:1 de `data.jsx`.
3. **Layout raíz y Nav.** Crear `app/layout.tsx` (fuente, `<Nav />`, `<main>`, footer) y `components/Nav.tsx` (client component) con menú desktop + panel móvil, contador de créditos, estado de sesión leído de `localStorage`.
4. **Auth global (client).** Crear `lib/auth.tsx` con contexto/hook simple (`useAuth`) que lea/escriba `av_user` en `localStorage` y exponga `login`, `loginAsGuest`, `signOut`. `Nav` y pantalla Auth lo consumen.
5. **Pantalla Biblioteca** (`app/page.tsx`): hero, buscador, chips de categoría, grid de `GameCard` con tilt on mouse-move, estado vacío "no hay resultados". Cada card enlaza a `/juego/[id]`.
6. **Pantalla Detalle** (`app/juego/[id]/page.tsx`): portada, tags, descripción, stat strip, leaderboard lateral con `seededScores`, botones "Jugar ahora" → `/juego/[id]/jugar` y "Volver al vault" → `/`.
7. **Pantalla Reproductor** (`app/juego/[id]/jugar/page.tsx`, client): HUD con score/vidas/nivel, pausa/fin, arena CRT decorativa (naves/enemigos CSS estáticos), modal de fin de partida con input de iniciales y botón "Guardar puntuación" que persiste en `av_scores` vía función de guardado.
8. **Pantalla Salón de la Fama** (`app/salon/page.tsx`): tabs por juego, podio top 3, tabla de ranking con `seededScores`, fila "tu mejor marca" si hay usuario logueado.
9. **Pantalla Auth** (`app/auth/page.tsx`, client): tabs iniciar sesión / crear cuenta, formulario fake, botón invitado, botones sociales decorativos, redirige a `/` tras "entrar".
10. **Pulido visual final.** Recorrer las 5 pantallas en navegador, comparar contra los templates (animaciones `fade-in`, `flicker`, `blink`, glow de neón, responsive del panel móvil) y ajustar clases Tailwind hasta paridad visual razonable.

## Criterios de aceptación

- [x] `/` muestra hero, buscador funcional (filtra por texto), chips de categoría funcionales, grid de 8 juegos con datos de `lib/data.ts`.
- [x] Buscar un término sin resultados muestra el estado vacío "NO HAY RESULTADOS".
- [x] Click en una card o en "JUGAR" navega a `/juego/[id]` con el `id` correcto.
- [x] `/juego/[id]` muestra info del juego y un leaderboard de 10 filas generado por `seededScores`.
- [x] "JUGAR AHORA" navega a `/juego/[id]/jugar`; "VOLVER AL VAULT" navega a `/`.
- [x] `/juego/[id]/jugar` incrementa el score automáticamente cada ~220ms mientras no está pausado ni terminado.
- [x] Botón "PAUSA" detiene el incremento de score y muestra overlay "EN PAUSA"; "REANUDAR" lo revierte.
- [x] Botón "FIN" abre modal con score final, input de iniciales y botón "GUARDAR PUNTUACIÓN".
- [x] Guardar puntuación escribe una entrada en `localStorage.av_scores` y muestra el toast "PUNTUACIÓN GUARDADA\_".
- [x] "JUGAR DE NUEVO" reinicia score/vidas/nivel sin salir de la pantalla; "VOLVER AL VAULT" navega a `/`.
- [x] `/salon` muestra tabs por los 8 juegos, podio top 3 y tabla de 12 filas; si hay usuario logueado, muestra fila "tu mejor marca".
- [x] `/auth` permite entrar con cualquier texto en "Usuario" (tab iniciar sesión o crear cuenta) y redirige a `/` guardando el nombre en `localStorage.av_user`.
- [x] "JUGAR COMO INVITADO" entra sin usuario (user = null) y redirige a `/`.
- [x] Tras login, el botón de auth en `Nav` muestra el nombre de usuario; click hace sign-out y limpia `localStorage.av_user`.
- [x] Panel móvil (`hamburger`) abre/cierra correctamente en viewport angosto y refleja las mismas rutas que el nav desktop.
- [x] No existe ninguna ruta ni componente que implemente lógica jugable real de los minijuegos (colisiones, input de teclado para jugar, reglas de puntuación reales).

## Decisiones tomadas y descartadas

- **App Router real con rutas de archivo** en vez de hash routing del template — se descarta el hash routing porque el proyecto ya es Next.js App Router y CLAUDE.md pide seguirlo; usar rutas reales da URLs limpias y es lo idiomático.
- **Port de CSS a Tailwind v4** en vez de copiar `styles.css` literal — se descarta copiar el CSS tal cual porque CLAUDE.md fija Tailwind v4 como estándar del proyecto.
- **Mantener la simulación decorativa del reproductor** (score auto-incremental, HUD, CRT) — se descarta quitar la animación porque es ambientación visual del template, no lógica de juego; lo que se excluye explícitamente es cualquier minijuego jugable real.
- **localStorage para user y scores**, sin backend — se descarta una API/BD porque el pedido es "solo la parte visual" y el template ya resuelve persistencia mínima así.
- **Todo Client Components** — se descarta separar Server/Client Components porque todas las pantallas dependen de `localStorage`, `useState` e interacción; forzar Server Components añadiría complejidad sin beneficio en este MVP visual.
- **Port directo del catálogo mock** (`GAMES`, `PLAYERS`, `seededScores`) — se descarta rediseñar los datos porque el objetivo es paridad visual con los templates existentes.
- **Botones sociales decorativos sin handler** — se descarta quitarlos porque el template los incluye como parte del diseño de la pantalla Auth.

## Riesgos identificados

- **Tailwind v4 + Next 16 pueden tener sintaxis de configuración distinta a la conocida** (breaking changes según AGENTS.md). Mitigación: consultar `node_modules/next/dist/docs/01-app` antes de escribir cada pantalla, no asumir APIs de versiones anteriores.
- **Paridad visual exacta con templates CSS puro vs. Tailwind utilitario** puede divergir en detalles finos (glow, timing de animaciones). Mitigación: paso 10 del plan dedicado a comparación visual final.
- **`setInterval` en el reproductor sin cleanup correcto** podría dejar timers corriendo al navegar fuera de la pantalla. Mitigación: usar `useEffect` con cleanup, igual que el template.
