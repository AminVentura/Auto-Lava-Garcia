# Refrescar web de antojosbarlounge.com en Firebase (2026-10-26)

Rama `fix/refrescar-web-2026-10-26`, sale de `chore/firebase-portal-2026-10-26` (fd04f06, el
`firebase.json` con el que se publicó). Fusionar las dos a `main`.

## Qué pasaba

- `antojosbarlounge.com` y `www` salen de Firebase Hosting (proyecto `antojos-kds`, sitio
  `antojosbarlounge`, target `portal`, carpeta `public/`). El panel (`admin.antojosbarlounge.com`,
  Vercel) guarda ofertas, precios y menú con commits a GitHub (`app/api/admin/save-json` →
  `data/*.json`) y el personal en `private/personal.json` (no es público).
- Antes, cada commit hacía que Vercel volviera a construir la web pública. Firebase no se entera:
  el botón «Actualizar web» llamaba al Deploy Hook de Vercel, que ya no publica la web pública.
- Lo que sí sigue al día sin publicar: las ofertas, precios del lavado y el menú que pinta
  `public/js/main.js` se leen primero de `raw.githubusercontent.com/AminVentura/Auto-Lava-Garcia/main`
  con `?v=<hora>`. Lo que no: el HTML, `public/data/*.json` (respaldo e imágenes de ofertas), QR y sitemap.

## Qué cambia

- `.github/workflows/firebase-hosting.yml`: cada push a `main` (menos `docs/`, `*.md` y `private/`) y
  `workflow_dispatch`. `npm ci`, `npm test`, `sync:data` + `qr:generate` + `sitemap` (el prebuild de Vercel)
  y `firebase deploy --only hosting:portal --project antojos-kds`. **Apagado** hasta
  `FIREBASE_DEPLOY_ENABLED=true` (deja una nota en verde, no falla).
- Botón **«Refrescar web»** en el panel (sección "Modo workflow" y junto a "Guardar oferta"):
  `POST /api/admin/refrescar-web` lanza el workflow; el panel sigue el estado (En cola → Publicando →
  Listo / Falló / Apagado). Una vez cada 2 min. Solo administradores de `ADMIN_EMAILS`; si la lista
  está vacía, nadie (ojo: el resto del panel deja entrar a cualquier cuenta de Clerk si `ADMIN_EMAILS`
  está vacío; conviene revisarlo aparte).
  Lógica en `lib/refrescar-web.ts` (igual que `CitaElCache10/lib/refrescarWeb.ts`).
- La tarjeta 6 del diagnóstico ya no habla del Deploy Hook: dice si falta `WEB_REFRESH_GITHUB_TOKEN`.
  `app/api/admin/deploy` se queda como estaba (archivado, sin uso desde el panel).
- `public/404.html` propia (antes salía la página 404 genérica de Firebase).

Revisado contra `vercel.json`: las 9 redirecciones, `/admin` → `admin.antojosbarlounge.com/admin`,
cabeceras de `/data/*.json` (CORS, caché 60 s), `ads.txt` y `sitemap.xml` ya estaban en `firebase.json`.
Curl de hoy: `/faq.html` 301, `/admin` 302, `ads.txt`, `robots.txt`, `sitemap.xml` 200, `/no-existe` 404.
Falta solo **www → raíz** (Vercel: 301; Firebase hoy: 200). No se puede por host en `firebase.json`:
se hace en la consola (paso 5). El canonical ya apunta a la raíz.

AntojoBot: el widget habla con `https://antojos-reserva.vercel.app/api/chat` (repo AntojosReserva). El
preflight CORS desde `https://antojosbarlounge.com` y `https://www.antojosbarlounge.com` responde 204 con
su origen. Sin cambios.

## Pasos para Amin

1. Workload Identity Federation en `antojos-kds` (número 416697795305):

   ```bash
   PROJECT=antojos-kds
   NUM=416697795305
   SA=github-hosting@$PROJECT.iam.gserviceaccount.com
   gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project $PROJECT
   gcloud iam service-accounts create github-hosting --project $PROJECT --display-name "GitHub publica Hosting"
   gcloud projects add-iam-policy-binding $PROJECT --member "serviceAccount:$SA" --role roles/firebasehosting.admin
   gcloud projects add-iam-policy-binding $PROJECT --member "serviceAccount:$SA" --role roles/serviceusage.serviceUsageConsumer
   gcloud iam workload-identity-pools create github --project $PROJECT --location global --display-name "GitHub"
   gcloud iam workload-identity-pools providers create-oidc autolava --project $PROJECT --location global \
     --workload-identity-pool github --issuer-uri https://token.actions.githubusercontent.com \
     --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
     --attribute-condition "assertion.repository=='AminVentura/Auto-Lava-Garcia' && assertion.ref=='refs/heads/main'"
   gcloud iam service-accounts add-iam-policy-binding $SA --project $PROJECT --role roles/iam.workloadIdentityUser \
     --member "principalSet://iam.googleapis.com/projects/$NUM/locations/global/workloadIdentityPools/github/attribute.repository/AminVentura/Auto-Lava-Garcia"
   gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo AminVentura/Auto-Lava-Garcia \
     --body "projects/416697795305/locations/global/workloadIdentityPools/github/providers/autolava"
   gh variable set GCP_SERVICE_ACCOUNT --repo AminVentura/Auto-Lava-Garcia --body "github-hosting@antojos-kds.iam.gserviceaccount.com"
   ```

   Si no se puede: secreto de repositorio `FIREBASE_SERVICE_ACCOUNT_ANTOJOS_KDS` (JSON de esa cuenta).
   El proyecto `antojos-kds` también tiene el KDS: la cuenta solo lleva el rol de Hosting.
2. Fusionar `chore/firebase-portal-2026-10-26` y luego `fix/refrescar-web-2026-10-26` a `main`.
   Vercel vuelve a construir el panel con el botón nuevo.
3. Encender: `gh variable set FIREBASE_DEPLOY_ENABLED --repo AminVentura/Auto-Lava-Garcia --body true` y
   `gh workflow run firebase-hosting.yml --repo AminVentura/Auto-Lava-Garcia --ref main`.
4. Token del botón: fine-grained, repositorio **solo** `AminVentura/Auto-Lava-Garcia`, permiso
   **Actions: Read and write**. En Vercel, proyecto `auto-lava-garcia`, Production:
   `WEB_REFRESH_GITHUB_TOKEN`. Confirmar que `ADMIN_EMAILS` tiene los correos de Angela y Amin.
   `ADMIN_VERCEL_DEPLOY_HOOK_URL` ya no hace falta.
5. www → raíz: consola de Firebase → Hosting → sitio `antojosbarlounge` → dominio
   `www.antojosbarlounge.com` → Editar → "Redirigir a" `antojosbarlounge.com`.
6. Prueba: en el panel, guardar una oferta → «Refrescar web» → Listo → recargar antojosbarlounge.com.

## Pruebas

- `npm test` (vitest): 40 pruebas, 0 fallos (10 nuevas en `tests/refrescar-web.test.ts`: permiso,
  ADMIN_EMAILS vacío, límite con Retry-After, sin token, estado y `firebase.json`).
- `npx tsc --noEmit` exit 0; `npm run build` exit 0.
