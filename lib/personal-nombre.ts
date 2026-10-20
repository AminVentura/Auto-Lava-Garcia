export function normalizarNombre(raw: string): string {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

export function mismoNombre(a: string, b: string): boolean {
  return normalizarNombre(a).toLocaleLowerCase('es') === normalizarNombre(b).toLocaleLowerCase('es');
}
