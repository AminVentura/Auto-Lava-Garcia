import { afterEach, describe, expect, it, vi } from 'vitest';

const clerk = vi.hoisted(() => ({ userId: 'user_1' as string | null, email: 'aminventura@gmail.com' as string | undefined }));
vi.mock('@clerk/nextjs/server', () => ({
  auth: async () => ({ userId: clerk.userId }),
  currentUser: async () => (clerk.email ? { primaryEmailAddress: { emailAddress: clerk.email } } : null),
}));

import { allowedAdminEmails, emailEstaAutorizado, getAdminSession } from '@/lib/admin-auth';

const lista = 'aminventura@gmail.com, antojosbarlounge@gmail.com';
const original = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = original;
  clerk.userId = 'user_1';
  clerk.email = 'aminventura@gmail.com';
});

describe('ADMIN_EMAILS', () => {
  it('lista vacía: nadie entra (no vale cualquier cuenta de Clerk)', () => {
    expect(allowedAdminEmails('')).toEqual([]);
    expect(emailEstaAutorizado('aminventura@gmail.com', '')).toBe(false);
    expect(emailEstaAutorizado('otra@gmail.com', undefined)).toBe(false);
  });

  it('Amin y Angela entran; otra cuenta no', () => {
    expect(emailEstaAutorizado('aminventura@gmail.com', lista)).toBe(true);
    expect(emailEstaAutorizado('AntojosBarLounge@gmail.com', lista)).toBe(true);
    expect(emailEstaAutorizado('otra@gmail.com', lista)).toBe(false);
  });
});

describe('getAdminSession (todo el panel)', () => {
  it('ADMIN_EMAILS vacío: 403 aunque la cuenta de Clerk sea válida', async () => {
    process.env.ADMIN_EMAILS = '';
    const s = await getAdminSession();
    expect(s.ok).toBe(false);
    if (!s.ok) {
      expect(s.status).toBe(403);
      expect(s.message).toMatch(/ADMIN_EMAILS/);
    }
  });

  it('ADMIN_EMAILS sin definir: 403', async () => {
    delete process.env.ADMIN_EMAILS;
    const s = await getAdminSession();
    expect(s.ok).toBe(false);
  });

  it('correo en la lista: entra; correo fuera: 403; sin sesión: 401', async () => {
    process.env.ADMIN_EMAILS = lista;
    expect(await getAdminSession()).toEqual({ ok: true, email: 'aminventura@gmail.com' });
    clerk.email = 'otra@gmail.com';
    expect(await getAdminSession()).toMatchObject({ ok: false, status: 403 });
    clerk.userId = null;
    expect(await getAdminSession()).toMatchObject({ ok: false, status: 401 });
  });
});
