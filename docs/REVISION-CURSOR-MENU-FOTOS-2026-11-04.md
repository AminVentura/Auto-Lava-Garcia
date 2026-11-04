# Revisión de los cambios de Cursor: menú digital con fotos (2026-11-04)

Origen: worktree `C:\Proyectos\_worktrees\AutoLavaGarcia-menu`, rama `feat/menu-digital-fotos-2026-11-03`,
10 cambios sin commit sobre `1fc77c4` (= origin/main). Esa carpeta no se tocó.
Revisión en `C:\Proyectos\_worktrees\AutoLavaGarcia-revision-1104`, rama `review/cursor-menu-fotos-2026-11-04`
(sin upstream a main, push solo de esta rama, sin PR, sin publicar).

## Qué intentó Cursor

1. **Fotos de platos desde el panel** (admin.antojosbarlounge.com, Vercel): botón «Subir foto» en cada
   artículo del menú del restaurante. El navegador reduce la foto a 720 px y la pasa a WebP; la ruta nueva
   `POST /api/admin/menu-foto` la guarda con un commit a `main` en `public/menu-fotos/<id>.webp` usando
   `ADMIN_GITHUB_TOKEN`. El artículo queda con `foto: https://antojosbarlounge.com/menu-fotos/<id>.webp`.
2. **Menú digital en la web pública**: en `index.html` y `menu.html` cada plato tiene «Ver foto» y
   «Agregar a la mesa». `menu.html` ahora pinta el menú completo (antes solo tenía enlaces).
3. **Pedido de mesa** (formulario nuevo «Pedido de la mesa»): mesa, nombre, teléfono y las dos casillas
   de Términos y Privacidad; manda el pedido a `https://antojosreserva.antojosbarlounge.com/api/pedido`
   (pantalla de cocina, se cobra en caja).
4. **Precio**: si un plato tiene precio en centavos, se muestra el precio aunque la etiqueta diga
   «Consultar en caja» (hoy afecta a *Jugos Naturales*: pasa a verse **RD$100.00**). El texto de
   `menu.html` sobre precios cambia en ese sentido.

## Pruebas (números)

| | origin/main | Cursor tal cual | Esta rama |
|---|---|---|---|
| vitest | 40/40 (4 archivos) | 43/43 (5) | **51/51 (6)** |
| tsc | 0 errores | 0 | **0** |
| `npm run build` | verde en CI (run 41637469520) | exit 0 | **exit 0** (ruta `/api/admin/menu-foto` incluida) |
| Playwright, 17 páginas × 390 y 1280 px | 0 errores | — | **0 errores de consola/JS, 0 respuestas 4xx/5xx** |

- Desborde horizontal: `index.html` a 390 px tiene 16 px de más **también en main** (no lo trajo Cursor).
- Pedido de mesa probado de punta a punta con la API **interceptada** (no se mandó ningún pedido real a la
  cocina): agrega platos, rechaza mesa «#5», envía `kind: comida`, `tableNumber`, `items` y las dos casillas,
  y muestra el número de pedido.
- Fotos: con una foto inyectada se abre la ventana, cierra con Escape; una URL de otro dominio o
  `javascript:` se descarta y no aparece el botón.
- AntojoBot: el script `antojobot-widget.js` sigue cargando en las 16 páginas que lo tenían.
- Los 8 tests nuevos de la ruta: 3 de ellos **fallan con la versión de Cursor** (lista de admins, permiso
  de la foto, límite) y pasan con la corregida.

## Revisión de la ruta de subida

| Punto | Cursor | Ahora |
|---|---|---|
| Solo admin (Clerk + `ADMIN_EMAILS`) | Clerk sí; pero si `ADMIN_EMAILS` está vacío **cualquier cuenta de Clerk sube** (así funciona `getAdminSession` en todo el panel) | Esta ruta exige `ADMIN_EMAILS` (403 si falta), como «Refrescar web» |
| Tipo de archivo por sus bytes | Sí: firma `RIFF....WEBP`; rechaza PNG/JPEG disfrazados | Igual (con prueba) |
| Tamaño | ≤ 350 KB (y base64 ≤ 500 000 caracteres) | Igual (con prueba) |
| Nombre / ruta | `id` con `^[a-z0-9-]{2,40}$`, sin `../` | Igual (con prueba) |
| Límite de uso | **No había** | 20 fotos por admin cada 10 min (memoria de la función; no es global) |
| Dónde se guarda | Commit a `main` en `public/menu-fotos/` con `ADMIN_GITHUB_TOKEN` | Igual. El commit ya no podría llevar el correo (repo **público**); queda en el log de Vercel |
| Token en el navegador | No llega: solo se usa en el servidor; el panel es cliente y no lo lee | Igual, con prueba que lo vigila |
| Licencia de las fotos | **No había aviso** | Aviso fijo en el panel + confirmación por cada foto; el servidor rechaza sin `permisoFoto: true` |

## Problemas encontrados, por gravedad

**Alta**
1. Sin aviso de licencia: se podía subir cualquier foto de internet a la web pública. → Corregido.
2. Con `ADMIN_EMAILS` vacío, cualquier persona que cree cuenta en Clerk podía subir fotos y publicar
   la web (cada foto es un commit a `main`). → Corregido en esta ruta. El resto del panel sigue igual (ver decisiones).

**Media**
3. Sin límite de subidas: un clic repetido o un script = muchos commits y publicaciones. → Corregido.
4. La mesa digital ofrecía «Agregar a la mesa» en Mercancías, incluidos **Cigarros**. → Quitado (igual que el formulario de pedido existente).
5. Al público se le mostraba «… todavía no tiene foto. Angela la sube en el admin.» en todos los platos. → «Ver foto» solo si hay foto.

**Baja**
6. Bloque de CSS de 50 líneas pegado dos veces. → Quitado.
7. Campos del formulario sin 16 px (zoom en iPhone) ni el estándar 56 px / radio 16. → Corregido.
8. «Mesa» aceptaba caracteres que la API rechaza con un error genérico. → Patrón igual al de la API y mensaje claro.
9. La foto aparece en el JSON en vivo (GitHub raw) antes de que Firebase termine de publicar el archivo
   (~1 min). → Si falla la carga, la ventana lo dice.
10. Cambiar la foto de un plato usa la misma URL: algún navegador puede ver la vieja hasta 1 hora (caché). Sin corregir; menor.

## Commits de esta rama

1. `c551701` Cambios de Cursor copiados tal cual.
2. `79b96c2` Ruta de fotos: `ADMIN_EMAILS` obligatorio, permiso de uso declarado, límite, sin correo en el commit; aviso en el panel; 8 pruebas.
3. `c3bb708` Menú público: CSS duplicado, «Ver foto» solo con foto, sin mercancías en la mesa, campos a 16 px, patrón de mesa.
4. Este documento.

## Lo que decide Amin

1. **Precio sobre etiqueta**: con este cambio *Jugos Naturales* se verá **RD$100.00** en lugar de «Consultar en caja».
   ¿Es el precio real y se quiere publicar? Si no, poner `precio_centavos` vacío en el panel.
2. **Pedido de mesa en la página de inicio**: el formulario pide «Mesa» también en `index.html`, donde casi nadie
   está sentado en el local; y convive con el pedido por WhatsApp. ¿Dejarlo solo en `menu.html` (o en la URL del QR de la mesa)?
3. **`ADMIN_EMAILS` en Vercel**: confirmar que está puesto. Si está vacío, el resto del panel (ofertas, precios, menú)
   sigue abierto a cualquier cuenta de Clerk. Recomendación: que `getAdminSession` niegue si está vacío (cambia todo el panel).
4. **Fotos dentro del repositorio público**: cada foto (hasta 350 KB) queda en el historial de git para siempre y cada subida
   publica la web (Firebase) y, si está conectado, construye en Vercel. Para pocas fotos sirve; si serán muchas, mejor
   Firebase Storage u otro almacén (gratis hasta cierto uso).
5. **Constancia del permiso**: hoy queda en el log de Vercel (caduca). Si se quiere constancia durable (quién subió qué foto y
   declaró permiso), hace falta un almacén.
6. **Registro del consentimiento del pedido de mesa**: lo guarda AntojosReserva (`formulario: menu_comida`, IP recortada), pero
   allí `ALMACEN_CONSENTIMIENTO_DURABLE = false`: solo en logs de Vercel. Pendiente ya conocido de AntojosReserva.

## ¿Listo para publicar?

**No todavía.** El código de esta rama pasa todo (51/51, tsc 0, build 0, 0 errores en 17 páginas a 390 y 1280 px),
pero un push a `main` publica solo, y antes Amin tiene que decidir los puntos 1–3 (precio visible, formulario
de mesa en inicio, `ADMIN_EMAILS`). Con esas tres respuestas, se puede unir a `main`.
