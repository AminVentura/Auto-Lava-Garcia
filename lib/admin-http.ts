export function getAdminErrorMessage(status: number, contentType: string | null, body: string): string {
  if (contentType?.includes('application/json')) {
    try {
      const payload = JSON.parse(body);
      return payload.error || `No se pudo guardar. Código ${status}.`;
    } catch {
      return `No se pudo leer la respuesta JSON del servidor. Código ${status}.`;
    }
  }

  const detail = body.trim().replace(/\s+/g, ' ').slice(0, 180);
  return detail
    ? `No se pudo guardar. Código ${status}: ${detail}`
    : `No se pudo guardar. Código ${status}.`;
}
