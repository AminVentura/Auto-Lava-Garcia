import { describe, expect, it } from 'vitest';
import { aplicarAccion, crearPerfil, type Perfil } from '../lib/personal';

const base = (): Perfil => {
  const creado = crearPerfil([], { nombre: 'Oliver Ventura', area: 'lavado', clave: 'clave-segura' });
  if (creado.error || !creado.lista[0]) throw new Error(creado.error || 'sin perfil');
  return creado.lista[0];
};

describe('rol del personal', () => {
  it('un alta vieja de lavado queda como administrador de lavado, no como lavador', () => {
    const perfil = base();
    expect(perfil.area).toBe('lavado');
    expect(perfil.rol).toBe('admin-lavado');
  });

  it('crear con rol lavador no le da entrada de administrador', () => {
    const creado = crearPerfil([], { nombre: 'Luis Pérez', rol: 'lavador', clave: 'clave-segura' });
    expect(creado.error).toBeNull();
    expect(creado.lista[0]?.rol).toBe('lavador');
    expect(creado.lista[0]?.area).toBe('lavado');
  });

  it('se puede cambiar el rol de un perfil ya creado', () => {
    const perfil = base();
    const cambio = aplicarAccion([perfil], { action: 'rol', id: perfil.id, rol: 'lavador' });
    expect(cambio.error).toBeNull();
    expect(cambio.lista[0]?.rol).toBe('lavador');
    expect(cambio.lista[0]?.area).toBe('lavado');
  });

  it('la administradora no cambia de rol por esta acción', () => {
    const duena = crearPerfil([], { nombre: 'Angela Admin', area: 'duena', clave: 'clave-segura' });
    const id = duena.lista[0]?.id || '';
    const cambio = aplicarAccion(duena.lista, { action: 'rol', id, rol: 'lavador' });
    expect(cambio.error).toMatch(/administradora/i);
  });
});
