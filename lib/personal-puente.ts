import { timingSafeEqual } from 'node:crypto';

export function puenteValido(header: string | null): boolean {
  const secret = (process.env.PERSONAL_BRIDGE_SECRET || '').trim();
  const dado = (header || '').trim();
  if (secret.length < 32 || dado.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(dado));
}
