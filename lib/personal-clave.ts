import { scryptSync, timingSafeEqual } from 'node:crypto';

export function claveCoincide(clave: string, salt: string, hash: string): boolean {
  try {
    const got = scryptSync(clave, salt, 32);
    const expected = Buffer.from(hash, 'hex');
    return got.length === expected.length && timingSafeEqual(got, expected);
  } catch {
    return false;
  }
}
