# 03 — About Page y Contacto (mock)

**Estado:** Approved
**Depende de:** SPEC 02
**Fecha:** 2026-08-19

**Objetivo:** Portar la página "Acerca de" (`about.jsx`) de `references/templates/home-about/` a la ruta `/acerca-de` en Next.js, incluyendo el formulario de contacto con envío simulado (mock, sin backend real ni persistencia).

## Alcance

**Incluye:**

- Nueva página `/acerca-de` (`app/acerca-de/page.tsx`), Client Component, portando 1:1 el contenido de `about.jsx`: sección hero (`about-hero` con kicker, título, misión, `highlight-row` de 3 highlights: ❤️ "Hecho con amor", navegador "Juegos en HTML", planta "Proyecto en crecimiento"), divisor animado (`about-divider` con píxeles parpadeantes), y sección de contacto (`about-contact` con `contact-intro` + `contact-form`).
- Animación reveal-on-scroll en `.about-divider` y `.about-contact` (mismo patrón `IntersectionObserver` + clase `.reveal`/`.in` ya usado en `/` desde el spec 02).
- Formulario de contacto con campos Nombre, Correo electrónico, Mensaje:
  - Validación: los 3 campos no pueden estar vacíos (trim), y el campo Correo debe tener formato de email válido (regex simple tipo `algo@algo.algo`). Si falla cualquiera de las dos validaciones, se aplica la animación `shake` (clase `.shake`, 400ms) y no se envía.
  - Al enviar con datos válidos, se simula el envío (mock): se muestra el bloque `terminal-success` con las líneas de "terminal" (`./send_message --to=team`, `[OK] Conectando...`, `[OK] Validando...`, `[OK] Transmitiendo...`, mensaje final con el nombre del remitente en mayúsculas). No hay llamada a ninguna API, no hay `fetch`, no se envía correo real, no se persiste el mensaje en ningún lado (ni localStorage ni backend). Es solo estado de React (`useState`) que cambia la UI.
  - Botón "Enviar otro mensaje" en el estado de éxito resetea el formulario a su estado inicial.
- CSS: portar literal el bloque About de `references/templates/home-about/styles.css` (líneas ~1073–1132: `.about-hero`, `.about-title`, `.about-mission`, `.highlight-row`, `.highlight` y variantes de color, `.about-divider`, `.div-bar`, `.div-pixels` + `@keyframes pxblink`, `.about-contact`, `.contact-grid`, `.contact-intro`, `.contact-title`, `.contact-sub`, `.contact-tips`, `.contact-form` + `@keyframes shake`, `.terminal-success` y sub-clases `.term-*`) a `app/globals.css`, siguiendo el mismo patrón de CSS plano ya usado en el proyecto (no utilidades Tailwind).
- Actualizar `components/Nav.tsx`: cambiar los 4 usos existentes de `/about` a `/acerca-de` (link desktop, link panel móvil, `isActive("about")`, y el nombre del route ya puede quedar como `"about"` internamente — solo cambia el `href` y el `pathname === "/about"` a `"/acerca-de"`).

**No incluye (fuera de este spec):**

- Envío de correo real (SMTP, servicio de terceros como Resend/SendGrid, etc.). Es explícitamente un mock de solo-UI.
- Persistencia del mensaje de contacto (ni localStorage ni base de datos ni API route). Se descarta explícitamente por decisión del usuario.
- Rate limiting, protección anti-spam, captcha.
- Icono SVG "GAMEPAD" (`.gp-*`) y cualquier otro bloque de CSS del template que no pertenezca a la sección About (ese CSS es de otra sección del template, no se toca).
- Cambios al modelo de datos de `lib/data.ts` o a `lib/auth.ts`.
- Tests automatizados.

## Modelo de datos

No se introduce modelo de datos nuevo ni persistencia. El estado del formulario (`{ name, email, msg }`), el estado de envío (`sent: string | null`) y el estado de error visual (`shake: boolean`) viven únicamente como `useState` local del componente de la página, igual que en `about.jsx`. No hay tipos nuevos en `lib/`.

## Plan de implementación

1. **Crear `app/acerca-de/page.tsx`.** Client Component (`"use client"`) portando el JSX de `about.jsx`: hero, highlight-row con los 3 íconos SVG pixelados (`HighlightIcon` como función auxiliar en el mismo archivo, igual que el patrón de otras páginas del proyecto), divisor, y sección de contacto con el formulario.
2. **Hook de reveal-on-scroll.** Reutilizar el mismo patrón `IntersectionObserver` ya portado en `/` (spec 02) para las clases `.reveal` de esta página (`about-divider`, `about-contact`).
3. **Lógica del formulario.** Implementar `onSubmit` con validación de campos no vacíos + formato de email; en caso de error, disparar `shake` por 400ms; en caso de éxito, setear `sent` con el nombre (trim + mayúsculas para el mensaje final) y renderizar `terminal-success` en vez del formulario. Botón "Enviar otro mensaje" resetea `sent` y `form`.
4. **Portar CSS de la sección About.** Copiar el bloque `.about-*` / `.highlight*` / `.div-*` / `.contact-*` / `.term-*` (líneas ~1073–1132 de `styles.css`) a `app/globals.css`, ajustando solo lo necesario para que compile con Tailwind v4 (revisar `node_modules/next/dist/docs/01-app` si hay dudas de sintaxis).
5. **Actualizar `Nav.tsx`.** Cambiar los 4 puntos que hoy apuntan a `/about` (link desktop, link móvil, y las 2 comparaciones en `isActive`) para que apunten a `/acerca-de`.
6. **Pulido visual final.** Comparar `/acerca-de` contra `about.jsx` en navegador (highlights, divisor animado, formulario, shake, terminal de éxito, responsive de `contact-grid`), y confirmar que el link "Acerca de" del Nav ya no da 404.

## Criterios de aceptación

- [ ] `/acerca-de` muestra la sección hero completa: kicker, título "ACERCA DE ARCADE VAULT", texto de misión, y los 3 highlights (corazón, navegador, planta).
- [ ] El divisor animado (`about-divider`) y la sección de contacto inician con opacidad 0 y aparecen (clase `.in`) al hacer scroll hasta ellos.
- [ ] Enviar el formulario con algún campo vacío aplica la animación `shake` y no avanza al estado de éxito.
- [ ] Enviar el formulario con un correo sin formato válido (ej. `"abc"`) aplica `shake` y no avanza al estado de éxito.
- [ ] Enviar el formulario con nombre, correo válido y mensaje no vacíos muestra el bloque `terminal-success` con el nombre en mayúsculas en la línea final, sin ninguna llamada de red.
- [ ] El botón "Enviar otro mensaje" vuelve a mostrar el formulario vacío.
- [ ] El link "Acerca de" del Nav (desktop y panel móvil) navega a `/acerca-de` y ya no da 404.
- [ ] El link "Acerca de" del Nav se marca activo (`isActive`) solo en `/acerca-de`.
- [ ] No existe ninguna llamada a `fetch`, API route, ni escritura a `localStorage` asociada al envío del formulario de contacto.

## Decisiones tomadas y descartadas

- **Ruta `/acerca-de` en vez de `/about`** — se descarta mantener `/about` (como sugería el link ya agregado en el spec 02) porque el usuario pidió explícitamente la ruta en español; esto obliga a actualizar los 4 usos de `/about` en `Nav.tsx`.
- **Mock de envío solo-UI, sin persistencia ni API route** — se descarta tanto guardar en `localStorage` como crear un endpoint mock (`app/api/contact/route.ts`) porque el usuario confirmó explícitamente que solo quiere la simulación visual del template, sin ningún tipo de backend ni almacenamiento.
- **Validación de email agregada sobre el comportamiento del template** — el template original (`about.jsx`) solo valida "no vacío"; se agrega validación de formato de email por decisión explícita del usuario, sin tocar la validación de nombre/mensaje (siguen siendo solo "no vacío").
- **CSS plano portado literal en vez de utilidades Tailwind** — se descarta reescribir a utilidades porque el proyecto ya sigue ese patrón desde los specs 01 y 02 (CSS plano dentro de `@import "tailwindcss"` + `@theme`).
