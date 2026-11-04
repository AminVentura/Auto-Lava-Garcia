const ID_PLATO = /^[a-z0-9-]{2,40}$/;
const FOTO_PUBLICA = /^https:\/\/antojosbarlounge\.com\/menu-fotos\/[a-z0-9-]{2,40}\.webp$/;

export const FOTO_PLATO_MAX_BYTES = 350_000;

export function idPlato(valor: unknown): string | null {
  const id = String(valor || '').trim();
  return ID_PLATO.test(id) ? id : null;
}

export function fotoPublica(valor: unknown): string | null {
  const foto = String(valor || '').trim();
  return FOTO_PUBLICA.test(foto) ? foto : null;
}

export function urlFotoPlato(id: string): string {
  return `https://antojosbarlounge.com/menu-fotos/${id}.webp`;
}

/** Acepta solo el data URL webp que produce el panel, y devuelve los bytes. */
export function bytesDeWebp(dataUrl: unknown): Uint8Array | null {
  const texto = String(dataUrl || '');
  const marca = 'data:image/webp;base64,';
  if (!texto.startsWith(marca)) return null;
  const limpio = texto.slice(marca.length).replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(limpio) || limpio.length > 500_000) return null;
  const bytes = Buffer.from(limpio, 'base64');
  if (bytes.length < 12 || bytes.length > FOTO_PLATO_MAX_BYTES) return null;
  const riff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const webp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return riff && webp ? bytes : null;
}

/** Máximo de fotos que un administrador puede subir en la ventana (cada foto es un commit y una publicación). */
export const FOTO_PLATO_LIMITE = 20;
export const FOTO_PLATO_VENTANA_MS = 10 * 60_000;

const subidas = new Map<string, number[]>();

/**
 * Límite de subidas por administrador. Vive en la memoria de la función de Vercel: frena
 * clics repetidos y scripts desde una sesión, no es un límite global entre instancias.
 */
export function puedeSubirFoto(clave: string, ahora = Date.now()): boolean {
  const recientes = (subidas.get(clave) || []).filter((t) => ahora - t < FOTO_PLATO_VENTANA_MS);
  if (recientes.length >= FOTO_PLATO_LIMITE) {
    subidas.set(clave, recientes);
    return false;
  }
  recientes.push(ahora);
  subidas.set(clave, recientes);
  return true;
}

/** Solo para pruebas. */
export function reiniciarLimiteFotos() {
  subidas.clear();
}

/** El administrador tiene que declarar, foto por foto, que tiene permiso para usarla. */
export function permisoDeclarado(valor: unknown): boolean {
  return valor === true;
}
