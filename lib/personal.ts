import { randomBytes, scryptSync } from 'node:crypto';

export type PersonalArea = 'duena' | 'lavado' | 'cocina' | 'mesero';

export type Perfil = {
  id: string;
  nombre: string;
  area: PersonalArea;
  salt: string;
  hash: string;
  active: boolean;
  createdAt: string;
};

export type Baja = {
  at: string;
  perfilId: string;
  nombre: string;
  area: string;
  reservaId: string;
  cliente: string;
  razon: string;
};

export const ROLES: { id: PersonalArea; label: string }[] = [
  { id: 'cocina', label: 'Encargada de cocina' },
  { id: 'lavado', label: 'Encargado del lavadero' },
  { id: 'mesero', label: 'Mesero' },
  { id: 'duena', label: 'Administradora' },
];

const AREAS = new Set<PersonalArea>(ROLES.map((rol) => rol.id));

export function normalizarNombre(raw: string): string {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function mismoNombre(a: string, b: string): boolean {
  return normalizarNombre(a).toLocaleLowerCase('es') === normalizarNombre(b).toLocaleLowerCase('es');
}

export function esArea(value: string): value is PersonalArea {
  return AREAS.has(value as PersonalArea);
}

function claveNueva(clave: string): { salt: string; hash: string } | { error: string } {
  if (clave.length < 8 || clave.length > 72) return { error: 'La clave debe tener entre 8 y 72 caracteres.' };
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(clave, salt, 32).toString('hex') };
}

export function crearPerfil(
  lista: Perfil[],
  input: { nombre: string; area: string; clave: string },
  now = new Date()
): { lista: Perfil[]; error: string | null } {
  const nombre = normalizarNombre(input.nombre);
  if (nombre.length < 2) return { lista, error: 'Escribe el nombre.' };
  if (!esArea(input.area)) return { lista, error: 'Elige el rol: cocina, lavadero, mesero o administradora.' };
  const cifrada = claveNueva(input.clave);
  if ('error' in cifrada) return { lista, error: cifrada.error };
  if (lista.some((perfil) => perfil.active && mismoNombre(perfil.nombre, nombre))) {
    return { lista, error: 'Ya hay un perfil activo con ese nombre.' };
  }
  return {
    lista: [
      ...lista,
      {
        id: `p-${randomBytes(4).toString('hex')}`,
        nombre,
        area: input.area,
        salt: cifrada.salt,
        hash: cifrada.hash,
        active: true,
        createdAt: now.toISOString(),
      },
    ],
    error: null,
  };
}

export function renombrarPerfil(lista: Perfil[], id: string, nombreRaw: string): { lista: Perfil[]; error: string | null } {
  const nombre = normalizarNombre(nombreRaw);
  if (nombre.length < 2) return { lista, error: 'Escribe el nombre.' };
  if (!lista.some((perfil) => perfil.id === id && perfil.active)) return { lista, error: 'Ese perfil no está activo.' };
  if (lista.some((perfil) => perfil.active && perfil.id !== id && mismoNombre(perfil.nombre, nombre))) {
    return { lista, error: 'Otro perfil ya usa ese nombre.' };
  }
  return { lista: lista.map((perfil) => (perfil.id === id ? { ...perfil, nombre } : perfil)), error: null };
}

export function cambiarClave(lista: Perfil[], id: string, clave: string): { lista: Perfil[]; error: string | null } {
  if (!lista.some((perfil) => perfil.id === id && perfil.active)) return { lista, error: 'Ese perfil no está activo.' };
  const cifrada = claveNueva(clave);
  if ('error' in cifrada) return { lista, error: cifrada.error };
  return {
    lista: lista.map((perfil) => (perfil.id === id ? { ...perfil, salt: cifrada.salt, hash: cifrada.hash } : perfil)),
    error: null,
  };
}

export function desactivarPerfil(lista: Perfil[], id: string): { lista: Perfil[]; error: string | null } {
  if (!lista.some((perfil) => perfil.id === id && perfil.active)) return { lista, error: 'Ese perfil no está activo.' };
  return { lista: lista.map((perfil) => (perfil.id === id ? { ...perfil, active: false } : perfil)), error: null };
}

export type PerfilVista = { id: string; nombre: string; area: PersonalArea; active: boolean; createdAt: string };

export function vistaPublica(lista: Perfil[]): PerfilVista[] {
  return lista.map((perfil) => ({
    id: perfil.id,
    nombre: perfil.nombre,
    area: perfil.area,
    active: perfil.active,
    createdAt: perfil.createdAt,
  }));
}

export function aplicarAccion(
  lista: Perfil[],
  body: { action?: string; id?: string; nombre?: string; area?: string; clave?: string }
): { lista: Perfil[]; error: string | null } {
  if (body.action === 'renombrar') return renombrarPerfil(lista, String(body.id || ''), body.nombre || '');
  if (body.action === 'clave') return cambiarClave(lista, String(body.id || ''), body.clave || '');
  if (body.action === 'desactivar') return desactivarPerfil(lista, String(body.id || ''));
  return crearPerfil(lista, { nombre: body.nombre || '', area: body.area || '', clave: body.clave || '' });
}
