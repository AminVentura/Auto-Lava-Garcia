import { auth, currentUser } from '@clerk/nextjs/server';

export type AdminSession =
  | { ok: true; email: string }
  | { ok: false; status: number; message: string };

function allowedEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
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

  const allowed = allowedEmails();
  if (allowed.length > 0 && !allowed.includes(email)) {
    return { ok: false, status: 403, message: 'Este usuario no está autorizado para administrar.' };
  }

  return { ok: true, email };
}
