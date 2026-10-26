/** ¿Hay lista blanca de administradores? Para acciones que no deben abrirse a cualquier cuenta de Clerk. */
export function listaAdminsConfigurada(env: Record<string, string | undefined> = process.env) {
  return String(env.ADMIN_EMAILS || '').split(',').some((email) => email.trim().length > 0);
}
