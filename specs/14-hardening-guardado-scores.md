# SPEC 14 — Hardening de guardado de puntuaciones (identidad y validación en `saveScore`)

> **Estado:** Approved
> **Depende de:** SPEC 12, SPEC 13
> **Fecha:** 2026-08-31
> **Objetivo:** Cerrar los hallazgos #6, #7, #8 y #10 del checklist de seguridad verificando la identidad con `getUser()`, validando `score`/`name` en `saveScore`, y atando la policy `scores_public_insert` a `auth.uid()` para impedir suplantación e inserts arbitrarios.

## Alcance

**Incluye:**

- `lib/actions/scores.ts`: reemplazar `supabase.auth.getSession()` por `supabase.auth.getUser()`; usar `user?.id ?? null` como `user_id` del insert (el flujo de invitado sin sesión sigue permitido, coincide con lo aceptado en SPEC 12).
- `lib/actions/scores.ts`: validar `score` (`Number.isInteger(score) && score >= 0 && score <= 999_999_999`) y `name` (`trim().length` entre 1 y 10, sin caracteres de control vía `/[\x00-\x1f\x7f]/`) antes del insert; lanzar `Error` con mensaje claro si no pasan.
- Migración SQL (`mcp__supabase__apply_migration`) que revoca los `GRANT` sobrantes de tabla en `public.games` y `public.scores` para `anon`/`authenticated`, dejando solo `SELECT` en ambas e `INSERT` en `scores` (hallazgo #8).
- Migración SQL que actualiza el `WITH CHECK` de la policy `scores_public_insert` para atar `user_id` a `auth.uid()`, permitiendo tanto el insert autenticado (`user_id` propio) como el insert de invitado (`user_id` null) (hallazgo #10).
- Confirmación con `mcp__supabase__get_advisors` (`type: security`) de que el cambio de grants no introduce advisories nuevos.
- Actualizar `references/security/security-checklist.md`: mover #6, #7, #8 y #10 a "Resueltos" con fecha y referencia a este spec.

**No incluye (fuera de este spec):**

- Los 4 ajustes manuales del dashboard de Supabase Auth (leaked password protection, longitud mínima de password, max signup rate, providers OAuth) — siguen pendientes, sin cambios.
- Content-Security-Policy, Strict-Transport-Security u otros headers — ya evaluados y descartados en SPEC 13.
- FK `scores.user_id → auth.users.id` — riesgo ya aceptado en SPEC 12 por el costo de migrar datos históricos de invitado.
- Tope de `score` por juego (ej. columna `max_score` en `games`) — el tope de este spec es genérico (`999_999_999`), no por juego; requeriría cambio de esquema y otro spec.
- Manejo de errores en la UI: `components/GamePlayer.tsx:179-182` llama `await saveScore(...)` sin `try/catch`. Un `Error` lanzado por la nueva validación se propaga sin mensaje claro para el jugador, igual que ya ocurre hoy con errores de Supabase. Se documenta como riesgo abajo, no se corrige aquí.

## Modelo de datos

No se crean tablas nuevas. Cambian:

- **Grants** de `public.games`/`public.scores` para roles `anon`/`authenticated` (se revocan `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE` sobrantes, se conserva `SELECT` en ambas e `INSERT` en `scores`).
- **Policy** `scores_public_insert` en `public.scores`:

  ```sql
  -- Antes
  WITH CHECK (true)

  -- Después
  WITH CHECK ((auth.uid() = user_id) OR (auth.uid() IS NULL AND user_id IS NULL))
  ```

## Plan de implementación

1. Migración `harden_scores_grants`: `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.games FROM anon, authenticated; REVOKE UPDATE, DELETE, TRUNCATE ON public.scores FROM anon, authenticated;` (se conserva `INSERT` en `scores`).
2. Migración `harden_scores_insert_policy`: `ALTER POLICY scores_public_insert ON public.scores WITH CHECK ((auth.uid() = user_id) OR (auth.uid() IS NULL AND user_id IS NULL));` (o `DROP POLICY` + `CREATE POLICY` si `ALTER POLICY ... WITH CHECK` no aplica sobre el tipo de policy existente).
3. Correr `mcp__supabase__get_advisors` (`type: security`) y confirmar que no aparecen advisories nuevos por el cambio de grants/policy.
4. Editar `lib/actions/scores.ts`: `getUser()` en vez de `getSession()`, validaciones de `score`/`name`, insert con `user_id: user?.id ?? null`.
5. `npm run build` para confirmar que compila sin errores.
6. Prueba manual en navegador:
   - Jugar como invitado (sin cuenta Supabase Auth) y guardar score → debe guardar con `user_id = null`.
   - Iniciar sesión con una cuenta de prueba y guardar score → debe guardar con `user_id = auth.uid()`.
   - Confirmar en Supabase (`execute_sql`) que un insert directo con `user_id` de otra cuenta (vía `service_role`, simulando el ataque) es rechazado por la policy cuando se ejecuta como `anon`/`authenticated` con un JWT que no corresponde a ese `user_id`.
7. Actualizar `references/security/security-checklist.md`: mover #6, #7, #8, #10 de "Abiertos" a "Resueltos", con la fecha de cierre y referencia a `SPEC 14`.

## Criterios de aceptación

- [x] `lib/actions/scores.ts` usa `supabase.auth.getUser()`, no `getSession()`.
- [x] `saveScore` rechaza (`throw`) `score` no entero, negativo o mayor a `999_999_999`.
- [x] `saveScore` rechaza (`throw`) `name` vacío, de más de 10 caracteres, o con caracteres de control.
- [x] Guardado como invitado (sin sesión) sigue funcionando, insertando `user_id = null`.
- [x] Guardado autenticado inserta `user_id = auth.uid()` verificado por `getUser()`, no por una cookie sin verificar.
- [x] Policy `scores_public_insert` en Supabase exige `auth.uid() = user_id` o ambos `null`; confirmado vía `pg_policies`.
- [x] `get_advisors` (`security`) no reporta advisories nuevos tras el cambio de grants.
- [x] `npm run build` pasa sin errores.
- [x] `references/security/security-checklist.md` tiene #6, #7, #8 y #10 movidos a "Resueltos" con fecha y referencia a SPEC 14.

## Decisiones tomadas y descartadas

- **Sí:** tras pasar a `getUser()`, seguir permitiendo invitados (`user_id: null`) cuando no hay sesión. Razón: coincide con el diseño intencional del producto (SPEC 12, Aceptado #1/#2 del checklist) — la remediación literal del hallazgo #6 sugería "rechazar si no hay usuario", pero eso rompería el flujo principal de invitado sin login.
- **No:** rechazar el guardado cuando no hay usuario autenticado. Descartado por la razón anterior.
- **Sí:** tope de `score` genérico (`999_999_999`) en vez de por juego. Razón: no existe hoy un tope por juego en el catálogo; un tope genérico alto bloquea valores absurdos/negativos sin arriesgar falsos rechazos.
- **No:** agregar columna `max_score` a `games` para validar por juego. Cambio de esquema mayor, se deja para otro spec si se necesita.
- **Sí:** validar `name` como "1-10 caracteres imprimibles" en vez de alfanumérico estricto. Razón: no restringe acentos/símbolos que el cliente (`normalizeDisplayName`) ya permite antes de mayuscular/recortar.
- **Sí:** incluir el hallazgo #8 (grants sobrantes) en este spec. Razón: se está tocando la policy de `scores` de todas formas; es el mismo tipo de cambio (migración SQL) y cierra un hallazgo más sin esfuerzo adicional.
- **No:** corregir el `try/catch` faltante en `components/GamePlayer.tsx` alrededor de `saveScore`. Es una mejora de UX, no de seguridad; se documenta como riesgo abajo para un spec futuro.
- **No:** agregar FK `scores.user_id → auth.users.id`. Riesgo ya aceptado en SPEC 12 por el costo de migrar `user_id = null` históricos.

## Riesgos

| Riesgo                                                                                                        | Mitigación                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GamePlayer.tsx` no envuelve `saveScore` en `try/catch`; un `Error` de validación queda sin manejar en la UI. | No es una regresión (ya pasaba con errores de Supabase); se documenta aquí para atenderlo en un spec de UX futuro.                  |
| Revocar grants rompe el insert legítimo de `scores` por un error en la migración.                             | Se prueba explícitamente guardado de invitado y autenticado tras la migración, más `get_advisors` para confirmar que no queda roto. |
| La policy nueva bloquea guardado autenticado legítimo si `auth.uid()` no coincide por algún bug de sesión.    | Se prueba el flujo autenticado end-to-end (login real + guardar score) antes de cerrar el spec, no solo con `execute_sql`.          |

## Qué **no** incluye este spec

- Ajustes manuales del dashboard de Supabase Auth (siguen pendientes, sin cambios).
- CSP/HSTS u otros headers HTTP.
- FK `scores.user_id → auth.users.id`.
- Tope de `score` por juego en el catálogo.
- Manejo de errores en la UI de `GamePlayer.tsx` alrededor de `saveScore`.

Cada uno de estos, si se necesita, va en su propio spec.
