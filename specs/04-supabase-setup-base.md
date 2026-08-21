# 04 — Setup base de Supabase

**Estado:** Implemented
**Depende de:** —
**Fecha:** 2026-08-20

**Objetivo:** Instalar y configurar el cliente de Supabase en el proyecto Next.js (paquetes, variables de entorno, helpers de cliente browser y server) usando el proyecto remoto ya existente, sin implementar todavía ninguna feature (auth, puntajes o catálogo).

## Alcance

**Incluye:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr` como dependencias del proyecto.
- Crear `lib/supabase/client.ts`: helper que expone un cliente Supabase para uso en Client Components (`createBrowserClient` de `@supabase/ssr`).
- Crear `lib/supabase/server.ts`: helper que expone un cliente Supabase para uso en Server Components / route handlers (`createServerClient` de `@supabase/ssr`, usando `cookies()` de `next/headers`).
- Agregar a `.env.template` las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (como placeholders, igual que `SUPABASE_DB_PASSWORD=xxx` ya existente), y setear sus valores reales en `.env.local` (gitignorado, no se commitea).
- Usar el proyecto Supabase remoto ya conectado vía MCP (`project_ref=hsqiwmudctxmdlcivdqz`, URL `https://hsqiwmudctxmdlcivdqz.supabase.co`), confirmado vacío (sin tablas en `public` todavía).
- Verificación: `npm run build` compila sin errores de TypeScript, confirmando que los helpers y el acceso a las variables de entorno están bien tipados.

**No incluye (fuera de este spec):**

- Autenticación real con Supabase Auth (reemplazo de `lib/auth.tsx`). Queda para un spec futuro dedicado a Auth, incluyendo la decisión de proveedores (email/password, Google, GitHub).
- `middleware.ts` para refresco de sesión/cookies. Se agrega en el spec de Auth, cuando exista una sesión real que refrescar.
- Migración de puntajes (`av_scores`, `seededScores`) a una tabla real.
- Migración del catálogo de juegos (`GAMES` de `lib/data.ts`) a una tabla real.
- Crear cualquier tabla, migración SQL o schema en la base de datos remota. Este spec es solo instalación y configuración del cliente en el código Next.js.
- Página o ruta de diagnóstico visual en el navegador — la verificación de este spec es solo build + tipos, no una prueba en runtime contra la API de Supabase.

## Modelo de datos

Este spec no introduce modelo de datos ni tablas en Supabase. Se limita a la capa de cliente en el código Next.js.

## Plan de implementación

1. **Instalar dependencias.** Agregar `@supabase/supabase-js` y `@supabase/ssr` a `package.json` (`npm install`).
2. **Variables de entorno.** Agregar `NEXT_PUBLIC_SUPABASE_URL=xxx` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxx` a `.env.template`; setear los valores reales del proyecto remoto en `.env.local` (no versionado, ya cubierto por `.gitignore` vía `.env*` / `!.env.template`).
3. **Cliente browser.** Crear `lib/supabase/client.ts` exportando una función `createClient()` que arma un cliente Supabase con `createBrowserClient` de `@supabase/ssr`, leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. **Cliente server.** Crear `lib/supabase/server.ts` exportando una función `createClient()` (async) que arma un cliente Supabase con `createServerClient` de `@supabase/ssr`, integrando `cookies()` de `next/headers` para leer/escribir cookies de sesión.
5. **Verificación final.** Correr `npm run build` y confirmar que compila sin errores de TypeScript ni de ESLint relacionados a los nuevos archivos, y que ninguna página existente se rompe.

## Criterios de aceptación

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen como dependencias en `package.json`.
- [ ] `.env.template` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como placeholders.
- [ ] Existe `lib/supabase/client.ts` exportando un cliente Supabase para Client Components, sin errores de tipos.
- [ ] Existe `lib/supabase/server.ts` exportando un cliente Supabase para Server Components/route handlers, sin errores de tipos.
- [ ] `npm run build` termina exitosamente sin errores de TypeScript ni ESLint.
- [ ] No se creó ninguna tabla ni migración SQL en el proyecto Supabase remoto.
- [ ] No se modificó `lib/auth.tsx`, `lib/data.ts` ni ninguna página existente.

## Decisiones tomadas y descartadas

- **`@supabase/supabase-js` + `@supabase/ssr`** — se descarta usar solo `@supabase/supabase-js` porque el proyecto usa Next.js App Router con Client y Server Components; `@supabase/ssr` es el paquete oficial recomendado por Supabase para manejar cookies de sesión correctamente en ambos contextos, y evita reestructurar el cliente cuando llegue el spec de Auth.
- **Dos helpers (`client.ts` y `server.ts`) desde ya** — se descarta crear solo el cliente browser porque el spec de Auth (futuro) va a necesitar el cliente server para leer sesión en Server Components/middleware; crearlo ahora evita retrabajo.
- **Auth fuera de este spec** — decisión explícita del usuario: este spec es solo "setup base" (paquetes, variables de entorno, clientes). Auth (login/registro con Supabase Auth) es un spec separado.
- **`middleware.ts` fuera de este spec** — se descarta agregarlo ahora porque el refresco de cookies de sesión solo tiene sentido una vez exista una sesión real que gestionar; se agrega junto con Auth.
- **`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** — se descarta `NEXT_PUBLIC_SUPABASE_ANON_KEY` (convención legacy) porque Supabase recomienda migrar a publishable key para proyectos nuevos.
- **Verificación por `npm run build` (sin página de diagnóstico)** — se descarta crear una ruta temporal de diagnóstico visual porque el usuario prefirió una verificación mínima de build + tipos, sin probar la conexión en runtime todavía.
- **Se reutiliza el proyecto Supabase remoto ya conectado** (`project_ref=hsqiwmudctxmdlcivdqz`, confirmado sin tablas en `public`) — se descarta crear un proyecto nuevo porque el `.mcp.json` ya apunta a uno existente y vacío, listo para usarse.

## Qué no incluye este spec

- Autenticación real (Supabase Auth) — spec futuro.
- Migración de puntajes/leaderboard a Supabase — spec futuro.
- Migración del catálogo de juegos a Supabase — spec futuro.
- Cualquier tabla, migración SQL, RLS policy o schema en la base de datos.
- `middleware.ts` de refresco de sesión.

Cada uno de estos, si se implementa, va en su propio spec.
