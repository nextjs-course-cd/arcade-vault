# 02 — Homepage Landing

**Estado:** Approved
**Depende de:** SPEC 01
**Fecha:** 2026-08-19

**Objetivo:** Portar la landing page (`home.jsx`) de `references/templates/home-about/` a `/` en Next.js, moviendo la Biblioteca actual a `/juegos` y actualizando Nav y todas las redirecciones internas que hoy asumen que `/` es la Biblioteca.

## Alcance

**Incluye:**

- Nueva página `/` (`app/page.tsx`): landing con hero (título con silhouettes flotantes decorativas, CTAs "Explorar juegos" y "Crear cuenta"), sección "¿Por qué Arcade Vault?" (4 feature cards), preview de juegos (6 `MiniCard` desde `GAMES`), sección de stats, sección "Actividad en vivo" (ticker de puntuaciones recientes + top 5 jugadores, datos mock hardcodeados igual que el template), sección de precios (plan único gratis + FAQ), CTA final. Todo portado 1:1 de `home.jsx`.
- Animación reveal-on-scroll (`IntersectionObserver` + clase `.reveal`/`.in`) igual que el template.
- Nueva página `/juegos` (`app/juegos/page.tsx`): contenido exacto que hoy vive en `app/page.tsx` (hero de biblioteca, buscador, chips, grid de `GameCard`), sin cambios de comportamiento, solo de ruta.
- CSS: portar el bloque `HOME PAGE` de `references/templates/home-about/styles.css` (`.home`, `.home-hero`, `.home-silos` y los 8 `.silo`, `.home-title`, `.hero-scroll`, `.home-section`, `.feature-grid`/`.feature-card`, `.mini-rail`/`.mini-card`, `.home-stats`, `.home-final`, `.reveal`) a `app/globals.css`, siguiendo el mismo patrón de CSS plano ya usado (no utilidades Tailwind).
- `Nav` actualizado: agrega link "Inicio" → `/` (antes de Biblioteca) y link "Acerca de" → `/about`, en desktop y panel móvil. Biblioteca pasa a apuntar a `/juegos`.
- Actualización de las 4 rutas/acciones que hoy redirigen a `/juegos`" asumiendo que era Biblioteca:
  - `app/juego/[id]/page.tsx`: botón "Volver al vault" → `/juegos`.
  - `app/juego/[id]/jugar/page.tsx`: botón "Volver al vault" → `/juegos`.
  - `app/salon/page.tsx`: botón/link de volver → `/juegos`.
  - `app/auth/page.tsx`: `router.push("/")` tras login y tras invitado → `router.push("/juegos")`.

**No incluye (fuera de este spec):**

- Página "Acerca de" / Contacto (`about.jsx`) — el link del Nav apunta a `/about` pero la ruta no se implementa en este spec; hasta que se implemente en otra iteración, ese link da 404. Es una decisión explícita del usuario.
- CSS de la sección About (`.about-*`) — no se porta en este spec.
- Cualquier dato o lógica nueva más allá de lo que ya existe en `lib/data.ts` (`GAMES`). Los bloques de "actividad en vivo" y "top jugadores" del home son arrays mock hardcodeados dentro del componente, igual que en `home.jsx`, no se integran con `seededScores` ni `av_scores`.
- Cambios al modelo de datos de `lib/data.ts`.
- Tests automatizados.

## Modelo de datos

No se introduce modelo de datos nuevo. Se reutiliza `GAMES` de `lib/data.ts` (ya existente) para la sección "Juegos disponibles ahora" (primeros 6). Las secciones de "actividad en vivo" y "top jugadores" usan arrays literales locales al componente (igual que `home.jsx`), sin persistencia ni tipos nuevos.

## Plan de implementación

1. **Mover Biblioteca a `/juegos`.** Crear `app/juegos/page.tsx` con el contenido exacto actual de `app/page.tsx` (hero, buscador, chips, grid). No cambiar lógica, solo la ruta.
2. **Nueva landing en `/`.** Reescribir `app/page.tsx` como Client Component portando `home.jsx`: hero con `FloatingSilhouettes` (SVGs decorativos), sección "¿Por qué Arcade Vault?", preview de juegos con `MiniCard` desde `GAMES.slice(0, 6)`, sección de stats, sección de actividad en vivo (ticker + top jugadores mock), sección de precios con FAQ, CTA final. Los componentes auxiliares (`FloatingSilhouettes`, `MiniCard`, `FeatureIcon`) viven en el mismo archivo, igual que el resto de páginas del proyecto.
3. **Hook de reveal-on-scroll.** Implementar el `useEffect` con `IntersectionObserver` que agrega `.in` a los `.reveal` al entrar en viewport, portado de `useReveal()` en `home.jsx`.
4. **Portar CSS del home.** Copiar el bloque `HOME PAGE` de `styles.css` a `app/globals.css`, ajustando únicamente lo necesario para que compile con Tailwind v4 (revisar `node_modules/next/dist/docs/01-app` si hay dudas de sintaxis).
5. **Actualizar `Nav`.** Agregar link "Inicio" (`/`) antes de "Biblioteca", cambiar "Biblioteca" a `/juegos`, agregar link "Acerca de" (`/about`) al final, en el menú desktop y en el panel móvil. Actualizar `isActive` para distinguir `/` (Inicio) de `/juegos` y sus subrutas `/juego/*` (Biblioteca).
6. **Actualizar redirecciones dependientes de la ruta antigua.** Cambiar los 4 puntos identificados (`app/juego/[id]/page.tsx`, `app/juego/[id]/jugar/page.tsx`, `app/salon/page.tsx`, `app/auth/page.tsx`) para que apunten/naveguen a `/juegos` en vez de `/`.
7. **Pulido visual final.** Comparar `/` contra `home.jsx` en navegador (silhouettes, reveal animations, responsive de `feature-grid`/`mini-rail`/`stats-inner`), y verificar que `/juegos` se comporta exactamente igual que antes de moverla.

## Criterios de aceptación

- [ ] `/` muestra la landing completa: hero con CTAs "Explorar juegos" y "Crear cuenta", sección de features (4 cards), preview de 6 juegos, stats, actividad en vivo, precios con FAQ, y CTA final.
- [ ] Las secciones con clase `reveal` inician con opacidad 0 y aparecen (clase `.in`) al hacer scroll hasta ellas.
- [ ] Botón "Explorar juegos" del hero y "Ver todos los juegos" de la sección de preview navegan a `/juegos`.
- [ ] Botón "Crear cuenta" del hero y "Empezar gratis" de precios navegan a `/auth`.
- [ ] Click en una `MiniCard` de la sección de preview navega a `/juego/[id]` del juego correspondiente.
- [ ] Botón "Ver salón" de la sección de actividad navega a `/salon`.
- [ ] `/juegos` muestra exactamente el mismo contenido y comportamiento (buscador, chips, grid) que antes tenía `/`.
- [ ] Nav (desktop y panel móvil) muestra 4 links: "Inicio" (`/`), "Biblioteca" (`/juegos`), "Salón de la Fama" (`/salon`), "Acerca de" (`/about`).
- [ ] El link "Biblioteca" del Nav se marca activo en `/juegos` y en `/juego/[id]` y `/juego/[id]/jugar`.
- [ ] El link "Inicio" del Nav se marca activo solo en `/`.
- [ ] Botón "Volver al vault" en `/juego/[id]` y en `/juego/[id]/jugar` navega a `/juegos`.
- [ ] Botón de volver en `/salon` navega a `/juegos`.
- [ ] Tras login, registro o "Jugar como invitado" en `/auth`, la redirección es a `/juegos` (no a `/`).
- [ ] No existe ninguna página `/about` en este spec; el link "Acerca de" del Nav puede dar 404 hasta la siguiente iteración.

## Decisiones tomadas y descartadas

- **`/` pasa a ser la landing y Biblioteca se mueve a `/juegos`** — se descarta mantener `/` como Biblioteca porque el template modela Inicio y Biblioteca como rutas distintas; el usuario confirmó explícitamente `/juegos` como slug (no `/biblioteca`).
- **Redirecciones post-login y "volver al vault" apuntan a `/juegos`, no a `/`** — se descarta seguir el literal del template (que redirige a "home") porque cambiaría la experiencia actual (el usuario espera volver al catálogo, no a la landing); decisión explícita del usuario.
- **Página "Acerca de" queda fuera de este spec, pero el link del Nav se agrega igual apuntando a `/about`** — se descarta ocultar el link hasta tener la página lista porque el usuario pidió explícitamente agregarlo ya, aceptando el 404 temporal.
- **Actividad en vivo y top jugadores como arrays mock hardcodeados en el componente** — se descarta conectarlos a `seededScores`/`av_scores` porque el template tampoco lo hace; mantiene paridad visual sin ampliar el modelo de datos.
- **CSS plano portado literal en vez de utilidades Tailwind** — se descarta reescribir a utilidades porque el proyecto ya sigue ese patrón desde el spec 01 (CSS plano dentro de `@import "tailwindcss"` + `@theme`).
