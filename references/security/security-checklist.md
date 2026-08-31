# Checklist de seguridad — Arcade Vault

Memoria persistente del agente `security-auditor`. **No borrar filas** — mover de
estado. Estados: `Abierto` → `En curso` → `Resuelto`, o `Aceptado` (riesgo asumido, con
razón) / `Pendiente manual` (dashboard de Supabase, fuera del código).

Última auditoría: 2026-08-31

## Abiertos

| #   | Severidad   | Superficie | Hallazgo                                                                                                                                                                  | Dónde                                                                                                                 | Remediación                                                                                                                                                    | Detectado  |
| --- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 9   | Informativo | BD         | Advisor de performance: `public.scores.game_id` (FK a `public.games.id`) no tiene índice de cobertura, lo que puede degradar joins/borrados a medida que crezca `scores`. | `get_advisors(type: performance)` → `unindexed_foreign_keys`, tabla `public.scores`, constraint `scores_game_id_fkey` | Crear `CREATE INDEX ON public.scores (game_id);` cuando el volumen de `scores` lo amerite. No es un hallazgo de seguridad, se deja registrado por completitud. | 2026-08-27 |

## Pendientes manuales (dashboard Supabase)

| #   | Ajuste                                                                                                       | Ruta en el dashboard                                            | Detectado  |
| --- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ---------- |
| 1   | Leaked password protection                                                                                   | Auth → Policies/Settings → activar "Leaked password protection" | 2026-08-27 |
| 2   | Minimum password length = 8                                                                                  | Auth → Settings → "Minimum password length"                     | 2026-08-27 |
| 3   | Max signup rate por IP                                                                                       | Auth → Rate Limits → configurar "Max signup rate"               | 2026-08-27 |
| 4   | Configurar providers OAuth Google/GitHub (código ya listo, `signInWithOAuth` implementado en `lib/auth.tsx`) | Auth → Providers → Google / GitHub                              | 2026-08-27 |

## Aceptados (riesgo asumido)

| #   | Hallazgo                                                                                                             | Razón                                                                                                                                                                                                       | Spec                                    |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | Policy `scores_public_insert` con `WITH CHECK (true)` — inserts públicos en `scores` sin restricción a nivel de RLS. | Intencional: los scores se guardan vía Server Action, no directo desde el cliente contra la tabla; se documenta como decisión consciente, no como hallazgo a corregir.                                      | SPEC 12/13                              |
| 2   | Sin FK `scores.user_id → auth.users.id`.                                                                             | Evitar riesgo de migración sobre datos existentes con `user_id = null` (scores históricos de invitado); queda como mejora futura.                                                                           | SPEC 12                                 |
| 3   | Sin Content-Security-Policy ni Strict-Transport-Security en `next.config.ts`.                                        | Una CSP mal calibrada puede romper Google Fonts o assets del juego sin haberlo probado antes; se limitan los headers a los 3 ya agregados (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`). | SPEC 13                                 |
| 4   | Mensajes de error crudos de Supabase (`error.message`) mostrados tal cual en `app/auth/page.tsx`.                    | Son los mensajes estándar de Supabase Auth (ej. "Invalid login credentials"), no exponen detalle interno sensible; se deja registrado por si cambia el proveedor de errores.                                | — (hallazgo informativo, no bloqueante) |

## Resueltos

| #   | Hallazgo                                                                                                     | Cómo se resolvió                                                                                                                                                                                                   | Spec    | Fecha      |
| --- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ---------- |
| 1   | RLS deshabilitado en `games`/`scores`.                                                                       | RLS habilitado (`rowsecurity = true`) en ambas tablas desde el setup inicial; confirmado de nuevo en esta auditoría.                                                                                               | SPEC 04 | 2026-08-22 |
| 2   | Función `SECURITY DEFINER` `public.rls_auto_enable()` ejecutable por `anon`/`authenticated` vía RPC pública. | `REVOKE EXECUTE` sobre `anon`/`authenticated` (y `PUBLIC`); confirmado en esta auditoría (`has_function_privilege` devuelve `false` para ambos roles).                                                             | SPEC 13 | 2026-08-27 |
| 3   | Sin headers de seguridad HTTP en Next.js.                                                                    | Agregados `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` en `next.config.ts`.                                                                                                                      | SPEC 13 | 2026-08-27 |
| 4   | (#6) `saveScore` usaba `supabase.auth.getSession()` en vez de `getUser()`, sin verificar el JWT server-side. | `lib/actions/scores.ts` ahora usa `supabase.auth.getUser()`; invitados sin sesión siguen guardando con `user_id: null`, autenticados con `user_id = auth.uid()` verificado.                                        | SPEC 14 | 2026-08-31 |
| 5   | (#7) `saveScore` no validaba `score` ni `name` antes de insertar.                                            | `lib/actions/scores.ts` valida `score` (entero, `0`–`999_999_999`) y `name` (`1`–`10` chars, sin caracteres de control) antes del insert; rechaza con `Error` si no cumplen.                                       | SPEC 14 | 2026-08-31 |
| 6   | (#8) Grants sobrantes de `INSERT/UPDATE/DELETE/TRUNCATE` en `games`/`scores` para `anon`/`authenticated`.    | Migración `harden_scores_grants`: `REVOKE` de los grants sobrantes, conservando `SELECT` en ambas e `INSERT` en `scores`; confirmado vía `information_schema.role_table_grants`.                                   | SPEC 14 | 2026-08-31 |
| 7   | (#10) `scores_public_insert` no ataba `user_id` a `auth.uid()`, permitiendo suplantar a otro jugador.        | Migración `harden_scores_insert_policy`: `WITH CHECK ((auth.uid() = user_id) OR (auth.uid() IS NULL AND user_id IS NULL))`; verificado con inserts simulados (suplantación rechazada, propio/invitado permitidos). | SPEC 14 | 2026-08-31 |
