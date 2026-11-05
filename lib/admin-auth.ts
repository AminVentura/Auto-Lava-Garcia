import { auth, currentUser } from '@clerk/nextjs/server';

export type AdminSession =
  | { ok: true; email: string }
  | { ok: false; status: number; message: string };

export function allowedAdminEmails(raw: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return (raw || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function emailEstaAutorizado(
  email: string,
  raw: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  const allowed = allowedAdminEmails(raw);
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}

export async function getAdminSession(): Promise<AdminSession> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, status: 401, message: 'Debe iniciar sesión.' };
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  if (!email) {
    return { ok: false, status: 403, message: 'La cuenta no tiene email principal.' };
  }

  if (!emailEstaAutorizado(email)) {
    return {
      ok: false,
      status: 403,
      message:
        allowedAdminEmails().length === 0
          ? 'Falta ADMIN_EMAILS: nadie puede administrar.'
          : 'Este usuario no está autorizado para administrar.',
    };
  }

  return { ok: true, email };
}
