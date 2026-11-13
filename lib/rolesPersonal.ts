/** Misma lista que AntojosReserva/lib/rolesPersonal.ts. El registro guarda el rol; el área sale de él. */
export const ROLES_EMPLEADO = [
  {
    id: 'lavador',
    area: 'lavado',
    label: 'Lavador',
    detalle: 'No entra al sistema. En Turno de lavado toca Mi historial, escribe su nombre y su clave, y ve sus vehículos del día y de la semana.',
  },
  {
    id: 'admin-lavado',
    area: 'lavado',
    label: 'Administrador de lavado',
    detalle: 'Entra con su nombre y su clave al turno de lavado.',
  },
  {
    id: 'cocinero',
    area: 'cocina',
    label: 'Cocinero',
    detalle: 'Entra con su nombre y su clave a cocina.',
  },
  {
    id: 'admin-cocina',
    area: 'cocina',
    label: 'Administrador de cocina',
    detalle: 'Entra con su nombre y su clave a cocina.',
  },
  {
    id: 'mesero',
    area: 'mesero',
    label: 'Mesero',
    detalle: 'Entra con su nombre y su clave a las mesas.',
  },
] as const;

export type RolEmpleado = (typeof ROLES_EMPLEADO)[number]['id'];
export type RolGuardado = RolEmpleado | 'duena';

export function esRolEmpleado(value: string): value is RolEmpleado {
  return ROLES_EMPLEADO.some((rol) => rol.id === value);
}

export function esRolGuardado(value: string): value is RolGuardado {
  return value === 'duena' || esRolEmpleado(value);
}

export function areaDeRol(rol: RolGuardado): 'lavado' | 'cocina' | 'mesero' | 'duena' {
  if (rol === 'duena') return 'duena';
  return ROLES_EMPLEADO.find((fila) => fila.id === rol)?.area || 'lavado';
}

export function rolDesdeArea(area: string): RolGuardado | null {
  if (area === 'duena') return 'duena';
  if (area === 'lavado') return 'admin-lavado';
  if (area === 'cocina') return 'admin-cocina';
  if (area === 'mesero') return 'mesero';
  return null;
}
