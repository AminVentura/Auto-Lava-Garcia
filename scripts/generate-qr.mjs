import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qrDir = path.join(root, 'public', 'qr');
const url = 'https://antojosbarlounge.com/';

await mkdir(qrDir, { recursive: true });

const svg = await QRCode.toString(url, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 2,
  width: 1200,
  color: {
    dark: '#0a1f28',
    light: '#ffffff',
  },
});

await writeFile(path.join(qrDir, 'antojosbarlounge-qr.svg'), svg, 'utf8');

await writeFile(
  path.join(qrDir, 'index.html'),
  `<!DOCTYPE html>
<html lang="es-DO">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>QR Auto Lava Garcia & Antojos Bar Lounge</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #0a1f28; background: #f7f4ec; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .sheet { width: min(720px, 100%); padding: 32px; text-align: center; background: #fff; border: 2px solid #0a1f28; border-radius: 24px; }
    h1 { margin: 0 0 8px; font-size: clamp(28px, 6vw, 48px); }
    p { margin: 8px 0; font-size: 20px; }
    img { width: min(420px, 92vw); height: auto; margin: 20px auto; }
    .url { font-size: 22px; font-weight: 800; word-break: break-word; }
    .print { margin-top: 20px; padding: 12px 18px; border: 0; border-radius: 999px; background: #c9a227; color: #0a1f28; font-weight: 800; cursor: pointer; }
    @media print {
      body { background: #fff; }
      main { min-height: auto; padding: 0; }
      .sheet { border: 0; border-radius: 0; box-shadow: none; }
      .print { display: none; }
    }
  </style>
</head>
<body>
  <main>
    <section class="sheet">
      <h1>Escanea el código</h1>
      <p>Auto Lava Garcia & Antojos Bar Lounge</p>
      <img src="/qr/antojosbarlounge-qr.svg" alt="QR hacia ${url}">
      <p class="url">${url}</p>
      <button class="print" onclick="window.print()">Imprimir QR</button>
    </section>
  </main>
</body>
</html>
`,
  'utf8',
);

console.log(`generated QR for ${url}`);
