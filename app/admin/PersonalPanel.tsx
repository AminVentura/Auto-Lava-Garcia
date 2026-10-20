'use client';

import { useEffect, useState, type FormEvent } from 'react';

type Cargo = {
  id: 'rol-angela' | 'rol-amin' | 'rol-cocina' | 'rol-lavado' | 'rol-mesero';
  cargo: string;
  area: 'duena' | 'lavado' | 'cocina' | 'mesero';
  nombre: string;
  activo: boolean;
  tieneClave: boolean;
};

type Baja = { at: string; nombre: string; area: string; reservaId: string; cliente: string; razon: string };

const VACIOS: Cargo[] = [
  { id: 'rol-angela', cargo: 'Administradora', area: 'duena', nombre: 'Angela García', activo: false, tieneClave: false },
  { id: 'rol-amin', cargo: 'Creador del sistema', area: 'duena', nombre: 'Amin Ventura', activo: false, tieneClave: false },
  { id: 'rol-cocina', cargo: 'Encargada de cocina', area: 'cocina', nombre: '', activo: false, tieneClave: false },
  { id: 'rol-lavado', cargo: 'Encargado del lavadero', area: 'lavado', nombre: '', activo: false, tieneClave: false },
  { id: 'rol-mesero', cargo: 'Mesero', area: 'mesero', nombre: '', activo: false, tieneClave: false },
];

export function PersonalPanel() {
  const [cargos, setCargos] = useState<Cargo[]>(VACIOS);
  const [bajas, setBajas] = useState<Baja[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>({});
  const [claves, setClaves] = useState<Record<string, string>>({});
  const [claves2, setClaves2] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function aplicar(lista: Cargo[]) {
    const porId = new Map(lista.map((cargo) => [cargo.id, cargo]));
    const siguiente = VACIOS.map((base) => porId.get(base.id) || base);
    setCargos(siguiente);
    setNombres(Object.fromEntries(siguiente.map((cargo) => [cargo.id, cargo.nombre])));
  }

  async function load() {
    const res = await fetch('/api/admin/personal', { cache: 'no-store' });
    const json = (await res.json().catch(() => ({}))) as { cargos?: Cargo[]; bajas?: Baja[]; error?: string };
    if (!res.ok) throw new Error(json.error || 'No se pudo cargar el personal');
    aplicar(json.cargos || []);
    setBajas(Array.isArray(json.bajas) ? json.bajas : []);
  }

  useEffect(() => {
    load().catch((error) => setMensaje(error instanceof Error ? error.message : 'Error'));
  }, []);

  async function guardar(event: FormEvent, cargo: Cargo) {
    event.preventDefault();
    const nombre = nombres[cargo.id] || '';
    const clave = claves[cargo.id] || '';
    const clave2 = claves2[cargo.id] || '';
    const pideClave = !cargo.tieneClave || editando === cargo.id;
    if (pideClave && clave !== clave2) {
      setMensaje('Las claves no coinciden.');
      return;
    }
    setBusy(cargo.id);
    setMensaje(null);
    try {
      const res = await fetch('/api/admin/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cargo.id, nombre, clave: pideClave ? clave : '' }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; cargos?: Cargo[] };
      if (!res.ok) throw new Error(json.error || 'No se guardó');
      aplicar(json.cargos || []);
      setClaves((prev) => ({ ...prev, [cargo.id]: '' }));
      setClaves2((prev) => ({ ...prev, [cargo.id]: '' }));
      setEditando(null);
      setMensaje(`${cargo.cargo} quedó guardado. Entra con su nombre y su clave.`);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'Error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel" aria-label="Perfiles del personal">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow admin-eyebrow">Solo Angela</p>
          <h2>Perfiles del local</h2>
        </div>
      </div>
      <p>
        Hay cinco perfiles: Angela, Amin, la encargada de cocina, el encargado del lavadero y el mesero.
        El nombre y la clave se guardan en el registro privado del local y siguen ahí al refrescar.
        Angela también puede entrar sin escribir nombre, con la clave de administradora.
        Si cocina, lavadero o mesero borran un pedido, tienen que poner la razón y su clave.
      </p>
      {mensaje ? <p className="status-line">{mensaje}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
        {cargos.map((cargo) => {
          const pideClave = !cargo.tieneClave || editando === cargo.id;
          return (
            <form key={cargo.id} onSubmit={(event) => void guardar(event, cargo)} style={{ display: 'grid', gap: '0.6rem', padding: '0.85rem', border: '1px solid rgba(16,36,45,0.12)', borderRadius: 16 }}>
              <strong>{cargo.cargo}</strong>
              <span style={{ color: '#5c6b73', fontSize: '0.85rem' }}>{cargo.activo ? 'Con clave' : 'Sin clave todavía'}</span>
              <label>
                Nombre
                <input
                  value={nombres[cargo.id] ?? cargo.nombre}
                  onChange={(event) => setNombres((prev) => ({ ...prev, [cargo.id]: event.target.value }))}
                  minLength={2}
                  maxLength={40}
                  required
                />
              </label>
              {pideClave ? (
                <>
                  <label>
                    {cargo.tieneClave ? 'Nueva clave' : 'Clave'}
                    <input
                      type="password"
                      value={claves[cargo.id] || ''}
                      onChange={(event) => setClaves((prev) => ({ ...prev, [cargo.id]: event.target.value }))}
                      minLength={8}
                      maxLength={72}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    Repetir clave
                    <input
                      type="password"
                      value={claves2[cargo.id] || ''}
                      onChange={(event) => setClaves2((prev) => ({ ...prev, [cargo.id]: event.target.value }))}
                      minLength={8}
                      maxLength={72}
                      required
                      autoComplete="new-password"
                    />
                  </label>
                </>
              ) : (
                <button className="secondary-btn" type="button" onClick={() => setEditando(cargo.id)}>
                  Modificar clave
                </button>
              )}
              <button className="primary-btn" type="submit" disabled={busy !== null}>
                {busy === cargo.id ? 'Guardando…' : !cargo.tieneClave ? 'Crear perfil' : editando === cargo.id ? 'Guardar clave' : 'Guardar nombre'}
              </button>
            </form>
          );
        })}
      </div>
      <h3>Bajas registradas</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Cuándo</th><th>Quién</th><th>Pedido</th><th>Razón</th></tr>
          </thead>
          <tbody>
            {bajas.length === 0 ? <tr><td colSpan={4}>Nadie ha borrado un pedido con registro.</td></tr> : null}
            {bajas.map((baja) => (
              <tr key={`${baja.at}-${baja.reservaId}`}>
                <td>{String(baja.at || '').slice(0, 16).replace('T', ' ')}</td>
                <td>{baja.nombre} · {baja.area}</td>
                <td>#{baja.reservaId} · {baja.cliente}</td>
                <td>{baja.razon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
