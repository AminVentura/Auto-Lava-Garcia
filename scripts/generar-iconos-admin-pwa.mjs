/**
 * Iconos de la PWA del panel de administración (/admin, admin.antojosbarlounge.com), 2026-10-15,
 * a partir del logo actual public/assets/antojos-bar-lounge-logo.png sin rediseñarlo: se toma el logo
 * entero y se completa a cuadrado con su propio fondo crema.
 * Usa `sharp` (ya instalado con Next). Uso: node scripts/generar-iconos-admin-pwa.mjs → public/admin-pwa/*.png
 * - icon-192/512 (any): el logo entero a sangre (alto completo, se completa arriba/abajo con su borde).
 * - maskable-192/512: el mismo cuadrado al 80 % sobre el fondo crema: el logotipo queda en la zona segura.
 * - apple-touch-icon (180): opaco, el cuadrado al 92 %.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, 'public', 'assets', 'antojos-bar-lounge-logo.png');
const out = path.join(root, 'public', 'admin-pwa');
fs.mkdirSync(out, { recursive: true });

// Fondo: el color de la esquina del propio logo.
const { data } = await sharp(src).extract({ left: 4, top: 4, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
const FONDO = { r: data[0], g: data[1], b: data[2], alpha: 1 };
// Cuadrado de 840 px: todo el alto del logo (558) y se completa arriba/abajo repitiendo su propio borde crema.
const cuadrado = await sharp(src)
  .extract({ left: 92, top: 0, width: 840, height: 558 })
  .extend({ top: 141, bottom: 141, extendWith: 'copy' })
  .png()
  .toBuffer();

async function icono(size, escala) {
  if (escala === 1) return sharp(cuadrado).resize(size, size).flatten({ background: FONDO }).png().toBuffer();
  const lado = Math.round(size * escala);
  const logo = await sharp(cuadrado).resize(lado, lado).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: FONDO } })
    .composite([{ input: logo, gravity: 'centre' }])
    .flatten({ background: FONDO })
    .png()
    .toBuffer();
}

for (const [nombre, size, escala] of [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['maskable-192.png', 192, 0.8],
  ['maskable-512.png', 512, 0.8],
  ['apple-touch-icon.png', 180, 0.92],
]) {
  fs.writeFileSync(path.join(out, nombre), await icono(size, escala));
  console.log(`${nombre} ${size}x${size}`);
}
