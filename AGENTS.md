# Agentes del proyecto — Auto Lava Garcia / Antojos Bar Lounge

Este archivo define cómo repartir el trabajo entre un **agente coordinador** y **subagentes** cuando haya que corregir AdSense (`ads.txt`) o despliegue.

## Agente principal (coordinador)

**Objetivo:** Dejar el sitio alineado con lo que exige Google AdSense y mantener el despliegue estático sin romper rutas públicas.

**Orden sugerido:**

1. Lanzar verificaciones del **Subagente A** (ads.txt / producción).
2. Si el código del repo está bien, escalar a **Subagente B** (DNS, dominio canónico, panel de hosting).
3. Tras cambios de hosting, confirmar que el dominio público sirve la versión actualizada.

---

## Subagente A — AdSense y `ads.txt` (técnico en repo)

**Responsabilidad:** Comprobar que el archivo y los encabezados son correctos en el código y en la URL pública.

**Checklist:**

- [ ] Existe `ads.txt` en la **raíz del sitio publicado** (mismo nivel que `index.html`), con una línea válida por publicador, por ejemplo:  
  `google.com, pub-8721021745606812, DIRECT, f08c47fec0942fa0`
- [ ] `vercel.json` y `netlify.toml` fuerzan `Content-Type: text/plain; charset=utf-8` para `/ads.txt`.
- [ ] No hay regla SPA del tipo “todas las rutas → `index.html`” que capture `/ads.txt` antes del archivo estático.
- [ ] `robots.txt` no bloquea a Googlebot en `/` (el `ads.txt` debe ser accesible; no debe devolver 404 ni HTML de error).

**Verificación en producción (ejecutar en terminal):**

```bash
curl -sS -D - -o NUL "https://antojosbarlounge.com/ads.txt"
```

En PowerShell:

```powershell
Invoke-WebRequest -Uri "https://antojosbarlounge.com/ads.txt" -Method Head | Select-Object StatusCode, Headers
```

Debe ser **200**, cuerpo **texto plano** con la línea de `google.com`, sin redirección infinita y sin sustituir el contenido por HTML.

---

## Subagente B — Dominio y despliegue (infra / “no encontrado”)

**Cuándo:** AdSense sigue marcando “archivo ads.txt no encontrado” pero el Subagente A ya validó el repo.

**Causas frecuentes:**

- El dominio registrado en AdSense es **www** y el sitio solo sirve en **apex** (o al revés); el crawler pide `https://DOMINIO-DE-ADSENSE/ads.txt` y obtiene 404.
- El proyecto en Vercel/Netlify usa **carpeta de salida** distinta de la raíz del repo y `ads.txt` no se copia al deploy.
- CDN o regla de firewall bloquea rutas desconocidas.

**Acciones:** Unificar canónico (301 entre www y no-www), asegurar que el deploy incluya `ads.txt` en la raíz pública, y volver a “Comprobar estado” en AdSense tras 24–72 h.

## Convención para el chat

En Cursor, puedes pedir explícitamente: *“Actúa como Subagente A y verifica ads.txt”* o *“Coordinador: ejecuta A luego B”* para seguir este flujo.
