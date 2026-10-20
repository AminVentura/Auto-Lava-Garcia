'use client';

import { useEffect, useState, type FormEvent } from 'react';

type Area = 'cocina' | 'lavado' | 'mesero' | 'duena';
type Perfil = { id: string; nombre: string; area: Area; active: boolean };
type Baja = { at: string; nombre: string; area: string; reservaId: string; cliente: string; razon: string };

const ROLES: { id: Area; label: string }[] = [
  { id: 'cocina', label: 'Encargada de cocina' },
  { id: 'lavado', label: 'Encargado del lavadero' },
  { id: 'mesero', label: 'Mesero' },
  { id: 'duena', label: 'Administradora' },
];

function rolDe(area: string): string {
  return ROLES.find((rol) => rol.id === area)?.label || area;
}

export function PersonalPanel() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [bajas, setBajas] = useState<Baja[]>([]);
  const [nombre, setNombre] = useState('');
  const [area, setArea] = useState<Area>('cocina');
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [claveId, setClaveId] = useState<string | null>(null);
  const [nueva, setNueva] = useState('');
  const [nueva2, setNueva2] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/personal', { cache: 'no-store' });
    const json = (await res.json().catch(() => ({}))) as { perfiles?: Perfil[]; bajas?: Baja[]; error?: string };
    if (!res.ok) throw new Error(json.error || 'No se pudo cargar el personal');
    setPerfiles(json.perfiles || []);
    setBajas(Array.isArray(json.bajas) ? json.bajas : []);
  }

  useEffect(() => {
    load().catch((error) => setMensaje(error instanceof Error ? error.message : 'Error'));
  }, []);

  async function enviar(body: Record<string, string>) {
    setBusy(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/admin/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; perfiles?: Perfil[] };
      if (!res.ok) throw new Error(json.error || 'No se guardó');
      setPerfiles(json.perfiles || []);
      return true;
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'Error');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function crear(event: FormEvent) {
    event.preventDefault();
    if (clave !== clave2) {
      setMensaje('Las claves no coinciden.');
      return;
    }
    const ok = await enviar({ nombre, area, clave });
    if (!ok) return;
    setNombre('');
    setClave('');
    setClave2('');
    setMensaje('Perfil creado. Entra en la pantalla del local con ese nombre y esa clave.');
  }

  return (
    <section className="panel" aria-label="Perfiles del personal">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow admin-eyebrow">Solo Angela</p>
          <h2>Perfiles del personal</h2>
        </div>
      </div>
      <p>
        Igual que en Precisely: se crea la persona, se le asigna el rol y se le pone la clave.
        El nombre es el que escribe para entrar. Angela sigue entrando sin nombre, con su clave de administradora.
        Esta misma pantalla también está en la cocina.
      </p>
      {mensaje ? <p className="status-line">{mensaje}</p> : null}
      <form onSubmit={(event) => void crear(event)} className="button-row">
        <label>
          Nombre
          <input value={nombre} onChange={(event) => setNombre(event.target.value)} minLength={2} maxLength={40} required />
        </label>
        <label>
          Rol
          <select value={area} onChange={(event) => setArea(event.target.value as Area)}>
            {ROLES.map((rol) => (
              <option key={rol.id} value={rol.id}>{rol.label}</option>
            ))}
          </select>
        </label>
        <label>
          Clave
          <input type="password" value={clave} onChange={(event) => setClave(event.target.value)} minLength={8} maxLength={72} required autoComplete="new-password" />
        </label>
        <label>
          Repetir clave
          <input type="password" value={clave2} onChange={(event) => setClave2(event.target.value)} minLength={8} maxLength={72} required autoComplete="new-password" />
        </label>
        <button className="primary-btn" type="submit" disabled={busy}>Crear perfil</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {perfiles.length === 0 ? <tr><td colSpan={4}>Todavía no hay perfiles.</td></tr> : null}
            {perfiles.map((perfil) => (
              <tr key={perfil.id}>
                <td>
                  {editId === perfil.id ? (
                    <input value={editNombre} onChange={(event) => setEditNombre(event.target.value)} maxLength={40} />
                  ) : (
                    perfil.nombre
                  )}
                </td>
                <td>{rolDe(perfil.area)}</td>
                <td>{perfil.active ? 'Activo' : 'Inactivo'}</td>
                <td>
                  {perfil.active ? (
                    <div className="button-row" style={{ marginTop: 0 }}>
                      {editId === perfil.id ? (
                        <button type="button" className="secondary-btn" disabled={busy} onClick={() => void enviar({ action: 'renombrar', id: perfil.id, nombre: editNombre }).then((ok) => ok && setEditId(null))}>
                          Guardar nombre
                        </button>
                      ) : (
                        <button type="button" className="secondary-btn" onClick={() => { setEditId(perfil.id); setEditNombre(perfil.nombre); }}>
                          Cambiar nombre
                        </button>
                      )}
                      {claveId === perfil.id ? (
                        <>
                          <input type="password" value={nueva} onChange={(event) => setNueva(event.target.value)} placeholder="Nueva clave" autoComplete="new-password" />
                          <input type="password" value={nueva2} onChange={(event) => setNueva2(event.target.value)} placeholder="Repetir clave" autoComplete="new-password" />
                          <button
                            type="button"
                            className="secondary-btn"
                            disabled={busy}
                            onClick={() => {
                              if (nueva !== nueva2) {
                                setMensaje('Las claves no coinciden.');
                                return;
                              }
                              void enviar({ action: 'clave', id: perfil.id, clave: nueva }).then((ok) => {
                                if (!ok) return;
                                setClaveId(null);
                                setNueva('');
                                setNueva2('');
                              });
                            }}
                          >
                            Guardar clave
                          </button>
                        </>
                      ) : (
                        <button type="button" className="secondary-btn" onClick={() => setClaveId(perfil.id)}>
                          Modificar clave
                        </button>
                      )}
                      <button type="button" className="secondary-btn" disabled={busy} onClick={() => void enviar({ action: 'desactivar', id: perfil.id })}>
                        Quitar acceso
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                <td>{baja.nombre} · {rolDe(baja.area)}</td>
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
