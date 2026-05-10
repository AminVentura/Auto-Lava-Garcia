# SEO_STRATEGY.md — antojosbarlounge.com
> Propiedad de Businessskore | Última actualización: 2026-05-09

---

## 1. ESTADO ACTUAL DEL SITIO

| Ítem | Estado |
|------|--------|
| Dominio | `antojosbarlounge.com` |
| AdSense | ⚠️ **No encontrado** — Revisión pendiente |
| robots.txt | ✅ Correcto |
| sitemap.xml | ✅ Actualizado — 4 URLs |
| HTTPS | ✅ Verificar redirección `http://` → `https://` |
| Hosting | Vercel / Netlify |

---

## 2. CHECKLIST GOOGLE SEARCH CONSOLE

### Paso 1 — Verificar propiedad del sitio
- [ ] Ingresar a [search.google.com/search-console](https://search.google.com/search-console)
- [ ] Agregar propiedad: `https://antojosbarlounge.com`
- [ ] Método de verificación recomendado: **Etiqueta HTML** o **DNS TXT record** (más estable para Vercel/Netlify)

### Paso 2 — Enviar Sitemap
- [ ] Ir a: Search Console → Sitemaps → Agregar sitemap
- [ ] URL a enviar: `https://antojosbarlounge.com/sitemap.xml`
- [ ] Verificar que Google lo lea correctamente (estado: "Éxito")

### Paso 3 — Solicitar indexación de la página principal
- [ ] Usar "Inspeccionar URL": `https://antojosbarlounge.com/`
- [ ] Hacer clic en "Solicitar indexación"

---

## 3. VERIFICACIÓN DE REDIRECCIONES HTTPS

Todas las variaciones deben redirigir a `https://antojosbarlounge.com/`:

| Origen | Destino esperado | Estado |
|--------|-----------------|--------|
| `http://antojosbarlounge.com` | `https://antojosbarlounge.com/` | ⬜ Verificar |
| `http://www.antojosbarlounge.com` | `https://antojosbarlounge.com/` | ⬜ Verificar |
| `https://www.antojosbarlounge.com` | `https://antojosbarlounge.com/` | ⬜ Verificar |

**Cómo verificar en terminal:**
```bash
curl -I http://antojosbarlounge.com
curl -I http://www.antojosbarlounge.com
```

**En Vercel** (`vercel.json`):
```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "has": [{ "type": "host", "value": "www.antojosbarlounge.com" }],
      "destination": "https://antojosbarlounge.com/$1",
      "permanent": true
    }
  ]
}
```

**En Netlify** (`netlify.toml`):
```toml
[[redirects]]
  from = "http://www.antojosbarlounge.com/*"
  to = "https://antojosbarlounge.com/:splat"
  status = 301
  force = true
```

---

## 4. ESTRUCTURA DE PÁGINAS Y PRIORIDADES SEO

| Página | URL | Prioridad | Frecuencia |
|--------|-----|-----------|------------|
| Inicio | `/` | 1.0 | Semanal |
| Aviso Legal | `/aviso-legal.html` | 0.3 | Anual |
| Política Privacidad | `/politica-privacidad.html` | 0.3 | Anual |
| Política Cookies | `/politica-cookies.html` | 0.3 | Anual |

> ⚠️ **Recomendación:** Este sitio tiene muy pocas páginas indexables. Para mejorar el posicionamiento SEO y la aprobación de AdSense, considera agregar páginas de contenido: menú, galería, reservaciones, historia del local.

---

## 5. CHECKLIST ADSENSE — "No encontrado"

- [ ] **Código AdSense en `<head>`** — Verificar que `index.html` tenga el snippet correcto con `pub-8721021745606812`
- [ ] **`ads.txt` en la raíz pública** — Verificar en `https://antojosbarlounge.com/ads.txt`
- [ ] **Contenido suficiente** — Google AdSense requiere contenido sustancial y original. Un sitio de solo 1 página con poco texto dificulta la aprobación.
- [ ] **Política de privacidad visible** — ✅ Ya existe

**Contenido de `ads.txt` requerido:**
```
google.com, pub-8721021745606812, DIRECT, f08c47fec0942fa0
```

---

## 6. KEYWORDS TARGET

### Primarias (mercado local)
- `antojos bar lounge`
- `bar lounge República Dominicana`
- `restaurante bar RD`

### Long-tail
- `antojos bar lounge menú`
- `bar lounge Santo Domingo`
- `reservaciones bar lounge RD`

---

## 7. SCRIPT DE GENERACIÓN DE SITEMAP

Para regenerar el sitemap cuando agregues nuevas páginas:
```bash
cd "Auto Lava Garcia"
node generate-sitemap.js
```

---

## 8. META TAGS RECOMENDADOS (index.html)

```html
<!-- SEO Básico -->
<meta name="description" content="Antojos Bar & Lounge — Ambiente único, gastronomía y coctelería en República Dominicana.">
<meta name="keywords" content="bar lounge dominicana, antojos bar, restaurante RD, coctelería dominicana">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://antojosbarlounge.com/">

<!-- Open Graph -->
<meta property="og:title" content="Antojos Bar & Lounge">
<meta property="og:description" content="Ambiente único, gastronomía y coctelería en República Dominicana.">
<meta property="og:url" content="https://antojosbarlounge.com/">
<meta property="og:type" content="website">
```

---

*Generado por Javi/Claude — Businessskore © 2026*
