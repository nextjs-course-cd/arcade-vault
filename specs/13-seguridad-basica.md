# SPEC 13 — Seguridad básica (función SECURITY DEFINER, headers Next.js)

> **Estado:** Done
> **Depende de:** SPEC 04, SPEC 06, SPEC 12
> **Fecha:** 2026-08-27
> **Objetivo:** Cerrar los hallazgos accionables del checklist de seguridad (`references/security/security-checklist.md`): revocar el acceso público a la función `SECURITY DEFINER` `rls_auto_enable()` y agregar headers de seguridad HTTP en Next.js, documentando como pasos manuales pendientes los ajustes de Auth del dashboard de Supabase.

## Alcance

**Incluye:**

- Migración SQL (vía `mcp__supabase__apply_migration`) que revoca `EXECUTE` sobre `public.rls_auto_enable()` a los roles `anon` y `authenticated`.
- `next.config.ts`: agregar la función `headers()` async con los 3 headers listados en el checklist (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) aplicados a todas las rutas (`/(.*)`).
- Confirmación con `mcp__supabase__get_advisors` (`type: security`) de que los warnings `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` desaparecen tras la migración.
- Confirmación de que RLS sigue habilitado (`rowsecurity = true`) en `games` y `scores` (ya verificado en la definición de este spec; no requiere cambios, solo se deja constancia).
- Documentación explícita, en este mismo spec, de los 3 ajustes de Auth del dashboard de Supabase que quedan como pasos manuales pendientes del usuario.

**No incluye (fuera de este spec):**

- Habilitar "Leaked password protection" en el dashboard de Supabase Auth — paso manual, fuera del código versionado.
- Configurar "Minimum password length" (8 caracteres) en el dashboard de Supabase Auth — paso manual.
- Configurar "Max signup rate" / CAPTCHA anti-bot en el dashboard de Supabase Auth — paso manual.
- Content-Security-Policy, Strict-Transport-Security u otros headers no listados en el checklist — se limita estrictamente a los 3 headers documentados para no romper nada sin probarlo primero.
- Eliminar (`DROP`) la función `rls_auto_enable()` — se mantiene por si el proceso de setup remoto la sigue invocando con `service_role`; solo se le revoca el acceso público.
- Auditoría completa de las políticas RLS de `scores`/`games` más allá de lo ya cubierto por SPEC 12 — RLS ya está confirmado habilitado y la policy `scores_public_insert` (`WITH CHECK true`) es intencional (inserts públicos de score).

## Modelo de datos

No se crean tablas nuevas ni se modifica el esquema de `games`/`scores`. El único cambio en la base de datos es un `REVOKE` sobre los privilegios de ejecución de la función existente `public.rls_auto_enable()`.

## Plan de implementación

1. Confirmar (de nuevo, antes de cerrar) que `rowsecurity = true` en `games` y `scores` vía `execute_sql`. Es una verificación, no un cambio.
2. Aplicar migración SQL con `mcp__supabase__apply_migration` (nombre `revoke_rls_auto_enable_execute`): `REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;`. Postgres otorga `EXECUTE` a `PUBLIC` por defecto en funciones nuevas, así que `anon`/`authenticated` seguían heredándolo por esa vía; se necesitó un segundo `REVOKE EXECUTE ... FROM PUBLIC;` (migración `revoke_rls_auto_enable_execute_public`) para que el advisor dejara de reportarlo.
3. Correr `mcp__supabase__get_advisors` (`type: security`) y confirmar que `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable` ya no aparecen en el resultado.
4. Editar `next.config.ts`: agregar `headers: async () => [{ source: "/(.*)", headers: securityHeaders }]` con el arreglo `securityHeaders` de los 3 headers del checklist.
5. Correr `npm run build` para confirmar que `next.config.ts` compila sin errores y que ninguna ruta existente se rompe.
6. Prueba manual en navegador: cargar `/` y verificar en DevTools → Network que la respuesta incluye `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`.
7. Dejar constancia en este spec (sección de decisiones) de los 3 pasos manuales pendientes del dashboard de Supabase Auth, para que el usuario los aplique fuera de este flujo.

## Criterios de aceptación

- [x] Migración aplicada: `REVOKE EXECUTE` sobre `public.rls_auto_enable()` para `anon` y `authenticated`.
- [x] `get_advisors` (`security`) ya no reporta `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable`.
- [x] `rowsecurity = true` confirmado en `games` y `scores` (sin cambios, solo verificación).
- [x] `next.config.ts` expone `headers()` con los 3 headers del checklist aplicados a todas las rutas.
- [x] `npm run build` pasa sin errores.
- [x] Verificación manual en navegador: DevTools → Network muestra los 3 headers en la respuesta de `/`.
- [x] `auth_leaked_password_protection`, longitud mínima de contraseña y máximo de signups quedan documentados como pendientes manuales — no se marcan como resueltos en este spec.

## Decisiones tomadas y descartadas

- **Sí:** revocar `EXECUTE` de `rls_auto_enable()` en vez de eliminar la función. Mantiene compatibilidad si algún flujo interno (`service_role`) la sigue usando; solo cierra el acceso público vía `anon`/`authenticated`.
- **Sí:** limitar los headers exactamente a los 3 del checklist (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`). Se descarta agregar CSP o HSTS en este spec porque una CSP mal calibrada puede romper fuentes (Google Fonts) o assets del juego sin haberlo probado antes; queda como mejora futura.
- **No:** aplicar los ajustes de Auth del dashboard (leaked password protection, min password length, max signup rate) desde este spec. Mismo patrón que SPEC 12 con los providers OAuth: son pasos manuales del dashboard de Supabase, fuera del código versionado. Quedan pendientes para el usuario:
  1. Auth → Policies/Settings → activar "Leaked password protection".
  2. Auth → Settings → "Minimum password length" = 8.
  3. Auth → Rate Limits → configurar "Max signup rate" por IP.
- **No:** tocar la policy `scores_public_insert` (`WITH CHECK true`). Es intencional (inserts públicos de score sin sesión bloqueante en la escritura), documentado ya en SPEC 12; no es un hallazgo a corregir.

## Riesgos

| Riesgo                                                                                 | Mitigación                                                                                                                                                                           |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Revocar `EXECUTE` en `rls_auto_enable()` rompe algún flujo interno que dependa de ella | Se revoca solo para `anon`/`authenticated`, no para `service_role`/`postgres`; se verifica con `npm run build` + prueba manual que catálogo y guardado de scores siguen funcionando. |
| `X-Frame-Options: DENY` bloquea algo embebido en iframe                                | El repo no usa iframes propios ni se embebe en otros sitios; se verifica visualmente tras el cambio.                                                                                 |
| Ajustes de Auth del dashboard quedan sin aplicar y se olvidan                          | Documentados explícitamente en este spec como pendientes manuales, igual que los providers OAuth de SPEC 12.                                                                         |

## Qué **no** incluye este spec

- Ajustes de Auth del dashboard de Supabase (leaked password protection, min password length, max signup rate).
- Content-Security-Policy, HSTS u otros headers no listados en el checklist.
- Eliminación de `rls_auto_enable()`.
- Auditoría de políticas RLS más allá de lo ya cubierto por SPEC 12.

Cada uno de estos, si se necesita, va en su propio spec o paso manual documentado.
