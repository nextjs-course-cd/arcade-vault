# SPEC 12 — Autenticación real con Supabase Auth

> **Estado:** Approved
> **Depende de:** SPEC 04, SPEC 06
> **Fecha:** 2026-08-27
> **Objetivo:** Reemplazar el login/registro simulado (`lib/auth.tsx`, solo nombre en `localStorage`) por Supabase Auth real (email/password + OAuth Google/GitHub), exigiendo sesión para jugar y guardar score.

## Alcance

**Incluye:**

- Reescritura de `lib/auth.tsx` (`AuthProvider`/`useAuth`) para envolver sesión real de Supabase Auth (`onAuthStateChange`, `getSession`), exponiendo `user` (`id`, `email`, `displayName`), `signUp(email, password, displayName)`, `signIn(email, password)`, `signInWithOAuth(provider)`, `signOut()`. Se elimina `loginAsGuest`.
- Reescritura de `app/auth/page.tsx`: tabs "Iniciar sesión" / "Crear cuenta" con campos email + contraseña, y en registro un campo adicional "Nombre de jugador" (mismas reglas de hoy: mayúsculas, máx. 10 caracteres), guardado como `display_name` en `user_metadata` vía `options.data` de `signUp`. Se conectan los botones Google/GitHub (ya dibujados) a `signInWithOAuth`. Se elimina el botón "JUGAR COMO INVITADO". Se agrega link "¿Olvidaste tu contraseña?".
- `app/auth/callback/route.ts` nuevo: intercambia el `code` de OAuth por sesión (`exchangeCodeForSession`) y redirige a `/juegos`.
- `app/auth/recuperar/page.tsx` nuevo: pide email, llama `supabase.auth.resetPasswordForEmail`.
- `app/auth/nueva-password/page.tsx` nuevo: formulario de nueva contraseña tras el link del correo, llama `supabase.auth.updateUser({ password })`.
- `middleware.ts` nuevo en la raíz: usa `@supabase/ssr` para refrescar la sesión y proteger `/juego/:id/jugar` (matcher por patrón de ruta), redirigiendo a `/auth` si no hay sesión activa. El resto de rutas (`/`, `/juegos`, `/juego/:id`, `/salon`, `/acerca-de`) siguen públicas.
- `lib/actions/scores.ts`: `saveScore` lee la sesión con el cliente server y guarda `user_id = session.user.id` en vez de `null`.
- `components/GamePlayer.tsx`: el campo de nombre en el modal de fin de partida deja de ser un input editable; se muestra de solo lectura con el `displayName` de la cuenta logueada.
- `components/YourBestScore.tsx`: el match de "tu mejor score" pasa de comparar `row.name === user.name` a comparar `row.user_id === user.id`.
- `components/Nav.tsx`: ajustar al nuevo shape de `useAuth()` si cambia; el botón "Salir" pasa a invocar `signOut()` real (cierra sesión de Supabase, no solo borra `localStorage`).

**No incluye (fuera de este spec):**

- Configurar los providers OAuth (Google/GitHub) en el dashboard de Supabase — es un paso manual del usuario, fuera del código. Sin esa config, los botones sociales fallarán en producción aunque el código esté completo.
- Página de perfil de usuario, edición de `display_name` post-registro, o historial personal de partidas.
- Migración o reasignación de los scores históricos con `user_id = null` — quedan igual, tratados como scores de invitado.
- Foreign key `scores.user_id → auth.users.id` a nivel de base de datos — no se agrega en este spec para evitar riesgo de migración sobre datos existentes.
- Roles, permisos o niveles de cuenta (admin, moderador, etc.).
- Rate limiting o protección anti-bot en los formularios de auth.

## Modelo de datos

No se crean tablas nuevas. Se usa el esquema de Supabase Auth (`auth.users`) ya provisto por la plataforma.

- `user_metadata.display_name`: string, seteado en `signUp` con `options.data.display_name`. Para cuentas creadas por OAuth (primer login), se autogenera del nombre/email que entrega el provider, normalizado a mayúsculas y máx. 10 caracteres.
- `scores.user_id` (ya existe, `uuid` nullable): pasa a poblarse con `auth.uid()` en cada partida guardada desde `/juego/:id/jugar`. La policy `scores_public_insert` (`with_check: true`) ya permite este insert sin cambios de RLS.

## Plan de implementación

1. Reescribir `lib/auth.tsx` para envolver Supabase Auth (sesión real vía `onAuthStateChange`/`getSession`, métodos `signUp`/`signIn`/`signInWithOAuth`/`signOut`). El resto de la app sigue compilando contra la interfaz vieja hasta el paso 3.
2. Crear `middleware.ts` protegiendo `/juego/:id/jugar`: sin sesión, redirige a `/auth`.
3. Reescribir `app/auth/page.tsx`: formulario real (email/password/nombre en registro), conectar a los métodos de `lib/auth.tsx`, conectar botones OAuth, quitar invitado, agregar link a recuperación.
4. Crear `app/auth/callback/route.ts` para el intercambio de código OAuth.
5. Crear `app/auth/recuperar/page.tsx` y `app/auth/nueva-password/page.tsx` para el flujo de "olvidé mi contraseña".
6. Actualizar `lib/actions/scores.ts` para insertar `user_id` real desde la sesión server-side.
7. Actualizar `components/GamePlayer.tsx`: nombre de solo lectura en el modal de fin de partida.
8. Actualizar `components/YourBestScore.tsx`: comparar por `user_id`.
9. Ajustar `components/Nav.tsx` al nuevo `useAuth()` (nombre + `signOut()` real).
10. Prueba manual completa: `npm run build` sin errores + flujo en navegador (registro, confirmación de email, login, redirect al intentar jugar sin sesión, partida completa con nombre bloqueado, logout, recuperación de contraseña).

## Criterios de aceptación

- [ ] `npm run build` pasa sin errores.
- [ ] Registrarse con email/password/nombre de jugador crea la cuenta y Supabase envía email de confirmación; no se puede iniciar sesión hasta confirmar.
- [ ] Iniciar sesión con email/password confirmado redirige a `/juegos`.
- [ ] Intentar acceder a `/juego/:id/jugar` sin sesión activa redirige a `/auth`.
- [ ] Con sesión activa, `/juego/:id/jugar` carga normalmente y al finalizar la partida el nombre mostrado en el modal es de solo lectura (no editable) con el `display_name` de la cuenta.
- [ ] Guardar score inserta la fila en `scores` con `user_id` igual al `id` de la cuenta logueada.
- [ ] "Tu mejor score" en la página de detalle del juego identifica correctamente al usuario logueado comparando por `user_id`.
- [ ] El botón "Salir" en `Nav.tsx` cierra la sesión de Supabase y redirige/actualiza el estado de auth en toda la app.
- [ ] El botón "JUGAR COMO INVITADO" ya no existe en `/auth`.
- [ ] El flujo "¿Olvidaste tu contraseña?" permite pedir el reset por email y setear una nueva contraseña.
- [ ] Los botones Google/GitHub disparan `signInWithOAuth` (el resultado final depende de que los providers estén configurados en el dashboard de Supabase, fuera de este spec).
- [ ] Los scores históricos con `user_id = null` siguen visibles en el leaderboard sin cambios.

## Decisiones

- **Sí:** Supabase Auth (email/password + OAuth) en vez de un sistema de auth propio. Ya usamos Supabase para `games`/`scores`; reutilizar el mismo proyecto evita infraestructura duplicada.
- **Sí:** confirmación de email obligatoria (flujo default de Supabase). No se desactiva en el dashboard para este spec.
- **Sí:** proteger `/juego/:id/jugar` con `middleware.ts`. Es el único punto donde hoy se escribe en `scores`; el resto del catálogo sigue público.
- **Sí:** eliminar el modo invitado. Al exigir sesión para jugar, mantenerlo en paralelo generaba una ruta para saltarse la autenticación real.
- **Sí:** nombre de jugador de solo lectura en el modal de fin de partida, tomado de la cuenta. Con cuentas reales, permitir reescribir el nombre libremente abre la puerta a suplantar a otros jugadores en el salón de la fama.
- **Sí:** `display_name` en `user_metadata` en vez de derivarlo del email. Da control real al usuario sobre su nombre público, consistente con el campo que ya existía en el mockup.
- **No:** FK `scores.user_id → auth.users.id`. Se documenta como mejora futura; agregarla ahora implica validar/migrar los `user_id = null` existentes, fuera del alcance de este spec.
- **No:** migrar o reasignar scores históricos. Quedan como scores de invitado, sin dueño.
- **No:** configurar los providers OAuth en el dashboard de Supabase desde este spec — es un paso manual fuera del código versionado.

## Riesgos

| Riesgo                                                                                                       | Mitigación                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Botones OAuth fallan en producción si los providers no están configurados en el dashboard de Supabase        | Documentado como paso manual pendiente del usuario; el código queda listo para cuando se configuren.                           |
| Confirmación de email agrega fricción y puede confundir en pruebas manuales                                  | Se documenta el flujo esperado ("revisa tu correo") en el paso 10 de verificación.                                             |
| `middleware.ts` es nuevo en el repo y puede interceptar rutas no previstas si el matcher es demasiado amplio | Matcher acotado explícitamente a `/juego/:id/jugar`; se verifica manualmente que el resto de rutas sigue accesible sin sesión. |

## Qué **no** incluye este spec

- Configuración de providers OAuth en Supabase Dashboard.
- Página de perfil o edición de nombre post-registro.
- Migración de scores históricos.
- Foreign key `scores.user_id → auth.users.id`.
- Roles/permisos de cuenta.
- Rate limiting en formularios de auth.

Cada uno de estos, si se necesita, va en su propio spec.
