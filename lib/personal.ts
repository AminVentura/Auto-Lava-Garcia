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

export const CARGOS = [
  { id: 'rol-angela', area: 'duena', cargo: 'Administradora', nombreBase: 'Angela García' },
  { id: 'rol-amin', area: 'duena', cargo: 'Creador del sistema', nombreBase: 'Amin Ventura' },
  { id: 'rol-cocina', area: 'cocina', cargo: 'Encargada de cocina', nombreBase: '' },
  { id: 'rol-lavado', area: 'lavado', cargo: 'Encargado del lavadero', nombreBase: '' },
  { id: 'rol-mesero', area: 'mesero', cargo: 'Mesero', nombreBase: '' },
] as const;

export type CargoId = (typeof CARGOS)[number]['id'];

export function normalizarNombre(raw: string): string {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

function mismoNombre(a: string, b: string): boolean {
  return normalizarNombre(a).toLocaleLowerCase('es') === normalizarNombre(b).toLocaleLowerCase('es');
}

export function esCargo(id: string): id is CargoId {
  return CARGOS.some((cargo) => cargo.id === id);
}

export function guardarCargo(
  lista: Perfil[],
  input: { id: string; nombre: string; clave?: string },
  now = new Date()
): { lista: Perfil[]; error: string | null } {
  const cargo = CARGOS.find((item) => item.id === input.id);
  if (!cargo) return { lista, error: 'Ese perfil no existe.' };
  const nombre = normalizarNombre(input.nombre);
  if (nombre.length < 2) return { lista, error: 'Escribe el nombre.' };
  const clave = String(input.clave || '');
  if (clave && (clave.length < 8 || clave.length > 72)) {
    return { lista, error: 'La clave debe tener entre 8 y 72 caracteres.' };
  }
  if (lista.some((perfil) => perfil.active && perfil.id !== cargo.id && mismoNombre(perfil.nombre, nombre))) {
    return { lista, error: 'Otro perfil ya usa ese nombre.' };
  }
  const idx = lista.findIndex((perfil) => perfil.id === cargo.id);
  if (idx < 0 && clave.length < 8) return { lista, error: 'Escribe una clave de 8 caracteres o más.' };
  let next = lista.map((perfil) => ({ ...perfil }));
  if (idx >= 0) {
    const prev = next[idx];
    next[idx] = {
      ...prev,
      nombre,
      area: cargo.area,
      active: true,
      ...(clave
        ? (() => {
            const salt = randomBytes(16).toString('hex');
            return { salt, hash: scryptSync(clave, salt, 32).toString('hex') };
          })()
        : {}),
    };
  } else {
    const salt = randomBytes(16).toString('hex');
    next.push({
      id: cargo.id,
      nombre,
      area: cargo.area,
      salt,
      hash: scryptSync(clave, salt, 32).toString('hex'),
      active: true,
      createdAt: now.toISOString(),
    });
  }
  if (cargo.area !== 'duena') {
    next = next.map((perfil) =>
      perfil.area === cargo.area && perfil.id !== cargo.id ? { ...perfil, active: false } : perfil
    );
  }
  return { lista: next, error: null };
}

export type CargoVista = {
  id: CargoId;
  cargo: string;
  area: PersonalArea;
  nombre: string;
  activo: boolean;
  tieneClave: boolean;
};

export function vistaCargos(lista: Perfil[]): CargoVista[] {
  return CARGOS.map((cargo) => {
    const propio = lista.find((perfil) => perfil.id === cargo.id && perfil.active);
    const heredado =
      propio ||
      (cargo.area === 'duena'
        ? undefined
        : lista.find((perfil) => perfil.active && perfil.area === cargo.area && !esCargo(perfil.id)));
    return {
      id: cargo.id,
      cargo: cargo.cargo,
      area: cargo.area,
      nombre: heredado?.nombre || cargo.nombreBase,
      activo: Boolean(heredado),
      tieneClave: Boolean(heredado?.hash),
    };
  });
}
