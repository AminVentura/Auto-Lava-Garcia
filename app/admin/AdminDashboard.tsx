'use client';

import { useEffect, useRef, useState } from 'react';
import {
  buildInstagramTargets,
  buildSocialCaption,
  buildWhatsAppOfferUrl,
  type InstagramAccountKey,
} from '@/lib/social';
import { getAdminErrorMessage } from '@/lib/admin-http';
import { formatDopAdminInput, parseDopInputToCents } from '@/lib/money';

export type Offer = {
  id: string;
  titulo: string;
  descripcion: string;
  imagen_base64: string;
  fecha_inicio: string;
  fecha_fin: string;
  publicada: boolean;
  orden: number;
};

export type MenuItem = {
  id: string;
  categoria: string;
  nombre: string;
  descripcion?: string | null;
  precio_centavos?: number | null;
  precio_min_centavos?: number | null;
  precio_max_centavos?: number | null;
  etiqueta?: string | null;
  disponible: boolean;
  orden: number;
};

export type ServiceItem = MenuItem & {
  vehiculo?: string | null;
};

export type JsonDoc<T> = {
  version: number;
  updated_at: string;
} & T;

type Props = {
  offersDoc: JsonDoc<{ ofertas: Offer[] }>;
  washDoc: JsonDoc<{ servicios: ServiceItem[] }>;
  menuDoc: JsonDoc<{ articulos: MenuItem[] }>;
};

type WorkflowStatus = {
  github: {
    repo: string;
    branch: string;
    tokenConfigured: boolean;
    ok: boolean;
    warning: string | null;
  };
  files: Array<{
    label: string;
    path: string;
    status: 'existe' | 'se-crea-al-guardar' | 'sin-token' | 'revisar-permisos';
  }>;
  automation: {
    manualSocialReady: boolean;
    deployHookConfigured: boolean;
  };
};

const blankOffer = {
  titulo: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
};

type SocialNetwork = 'instagram';

const socialNetworkLabels: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
};

const instagramAccountLabels: Record<InstagramAccountKey, string> = {
  autolavagarcia: '@AutoLavaGarcia',
  antojosbarlounge: '@antojosbarlounge',
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

function assertRdDate(value: string) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    throw new Error('Las fechas deben estar en formato DD/MM/AAAA.');
  }
}

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 300 / bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar la imagen.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.78));
  if (!blob) throw new Error('No se pudo comprimir la imagen.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob);
  });
}

export default function AdminDashboard({ offersDoc, washDoc, menuDoc }: Props) {
  const [offers, setOffers] = useState(offersDoc.ofertas);
  const [washServices, setWashServices] = useState(washDoc.servicios);
  const [menuItems, setMenuItems] = useState(menuDoc.articulos);
  const [offerForm, setOfferForm] = useState(blankOffer);
  const [offerImage, setOfferImage] = useState('');
  const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>(['instagram']);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccountKey[]>([
    'autolavagarcia',
    'antojosbarlounge',
  ]);
  const [status, setStatus] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/status')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setWorkflowStatus(payload);
      })
      .catch(() => {
        if (!cancelled) setWorkflowStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeOffers = offers.filter((offer) => {
    if (!offer.publicada) return false;
    const [startDay, startMonth, startYear] = offer.fecha_inicio.split('/').map(Number);
    const [endDay, endMonth, endYear] = offer.fecha_fin.split('/').map(Number);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0);
    const end = new Date(endYear, endMonth - 1, endDay, 23, 59, 59);
    return start <= today && today <= end;
  });

  const visibleWashServices = washServices.filter((item) => item.disponible).length;
  const visibleMenuItems = menuItems.filter((item) => item.disponible).length;

  function toggleNetwork(network: SocialNetwork) {
    setSocialNetworks((current) =>
      current.includes(network)
        ? current.filter((entry) => entry !== network)
        : [...current, network],
    );
  }

  function toggleInstagramAccount(account: InstagramAccountKey) {
    setInstagramAccounts((current) =>
      current.includes(account)
        ? current.filter((entry) => entry !== account)
        : [...current, account],
    );
  }

  async function postAdminAction(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(getAdminErrorMessage(response.status, response.headers.get('content-type'), responseBody));
    }
  }

  async function saveJson(target: 'ofertas' | 'lavado' | 'menu', doc: unknown) {
    setStatus('Guardando cambios en GitHub...');
    const response = await fetch('/api/admin/save-json', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ target, doc }),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(getAdminErrorMessage(response.status, response.headers.get('content-type'), body));
    }
    setStatus('Cambios guardados en GitHub. Usa "Actualizar web" para publicar en producción si no hay deploy automático.');
  }

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error inesperado.');
    }
  }

  async function addOffer() {
    const title = offerForm.titulo.trim();
    if (!title) throw new Error('El título de la oferta es obligatorio.');
    if (!offerImage) throw new Error('Debe subir una imagen para la oferta.');
    assertRdDate(offerForm.fecha_inicio);
    assertRdDate(offerForm.fecha_fin);

    const nextOffer: Offer = {
      id: `${slugify(title)}-${Date.now()}`,
      titulo: title,
      descripcion: offerForm.descripcion.trim(),
      imagen_base64: offerImage,
      fecha_inicio: offerForm.fecha_inicio.trim(),
      fecha_fin: offerForm.fecha_fin.trim(),
      publicada: true,
      orden: offers.length + 1,
    };
    const nextOffers = [...offers, nextOffer];
    await saveJson('ofertas', { ...offersDoc, ofertas: nextOffers });
    setOffers(nextOffers);
    setOfferForm(blankOffer);
    setOfferImage('');
  }

  async function publishOfferSocial(offer: Offer) {
    if (instagramAccounts.length === 0) {
      throw new Error('Selecciona al menos una cuenta de Instagram para publicar.');
    }

    await copyOfferCaption(offer);
    const imageDownloaded = downloadOfferImage(offer);
    buildInstagramTargets(instagramAccounts).forEach((target) => {
      window.open(target.url, '_blank', 'noopener,noreferrer');
    });
    setStatus(
      imageDownloaded
        ? 'Kit social listo: caption copiado, imagen descargada e Instagram abierto.'
        : 'Kit social listo: caption copiado e Instagram abierto. Esta oferta no tiene imagen guardada.',
    );
  }

  async function deploySite() {
    setStatus('Solicitando actualización de la web...');
    await postAdminAction('/api/admin/deploy');
    setStatus('Actualización de la web solicitada. Vercel puede tardar unos segundos.');
  }

  async function saveOffers(nextOffers = offers) {
    await saveJson('ofertas', { ...offersDoc, ofertas: nextOffers });
    setOffers(nextOffers);
  }

  async function saveWash() {
    await saveJson('lavado', { ...washDoc, servicios: washServices });
  }

  async function saveMenu() {
    await saveJson('menu', { ...menuDoc, articulos: menuItems });
  }

  async function copyOfferCaption(offer: Offer) {
    const caption = buildSocialCaption({
      title: offer.titulo,
      description: offer.descripcion,
      endsAt: offer.fecha_fin,
      publicUrl: 'https://antojosbarlounge.com/#ofertas-antojos',
    });

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(caption);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = caption;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setStatus('Caption copiado al portapapeles.');
    } catch {
      window.prompt('Copia este caption para redes:', caption);
      setStatus('El navegador bloqueó el portapapeles; se mostró el caption para copiar manualmente.');
    }
  }

  function downloadOfferImage(offer: Offer) {
    if (!offer.imagen_base64) return false;
    const link = document.createElement('a');
    link.href = offer.imagen_base64;
    link.download = `${offer.id || slugify(offer.titulo)}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  function openOfferWhatsApp(offer: Offer) {
    const url = buildWhatsAppOfferUrl({
      phone: '18097941824',
      title: offer.titulo,
      publicUrl: 'https://antojosbarlounge.com/#ofertas-antojos',
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    setStatus('WhatsApp abierto para esta oferta.');
  }

  return (
    <>
      {status && <p className="status-line">{status}</p>}

      <section className="dashboard-grid" aria-label="Resumen administrativo">
        <article className="metric-card metric-card--dark">
          <span>Ofertas activas</span>
          <strong>{activeOffers.length}</strong>
          <p>{offers.length} ofertas guardadas en total</p>
        </article>
        <article className="metric-card">
          <span>Menú lavadero</span>
          <strong>{visibleWashServices}</strong>
          <p>Servicios visibles para clientes</p>
        </article>
        <article className="metric-card">
          <span>Restaurante</span>
          <strong>{visibleMenuItems}</strong>
          <p>Artículos visibles en el menú digital</p>
        </article>
        <article className="metric-card metric-card--gold">
          <span>Publicación social</span>
          <strong>{instagramAccounts.length}/2</strong>
          <p>Cuentas Instagram marcadas</p>
        </article>
      </section>

      <section className="quick-actions" aria-label="Accesos rápidos">
        <a className="quick-action" href="https://antojosbarlounge.com/" target="_blank" rel="noopener">Página pública</a>
        <a className="quick-action" href="https://antojosbarlounge.com/#menu-digital-restaurante" target="_blank" rel="noopener">Menú restaurante</a>
        <a className="quick-action" href="https://antojosbarlounge.com/#menu-digital-lavado" target="_blank" rel="noopener">Menú lavado</a>
        <a className="quick-action" href="https://antojosbarlounge.com/qr/" target="_blank" rel="noopener">QR imprimible</a>
      </section>

      <section className="panel workflow-panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow admin-eyebrow">Modo workflow</p>
            <h2>Salud del guardado automático</h2>
          </div>
          <div className="button-row" style={{ marginTop: 0 }}>
            <button className="primary-btn" type="button" onClick={() => run(deploySite)}>Actualizar web</button>
            <button className="secondary-btn" type="button" onClick={() => window.location.reload()}>Refrescar estado</button>
          </div>
        </div>
        {workflowStatus ? (
          <div className="workflow-grid">
            <article className={workflowStatus.github.tokenConfigured ? 'workflow-step is-ok' : 'workflow-step is-warning'}>
              <span>1</span>
              <strong>GitHub</strong>
              <p>{workflowStatus.github.repo} / {workflowStatus.github.branch}</p>
              <small>{workflowStatus.github.tokenConfigured ? 'Token configurado' : 'Falta ADMIN_GITHUB_TOKEN'}</small>
            </article>
            {workflowStatus.files.map((file, index) => (
              <article className={file.status === 'revisar-permisos' ? 'workflow-step is-danger' : 'workflow-step is-ok'} key={file.path}>
                <span>{index + 2}</span>
                <strong>{file.label}</strong>
                <p>{file.path}</p>
                <small>{file.status === 'existe' ? 'Existe en GitHub' : file.status === 'se-crea-al-guardar' ? 'Se creará al guardar' : file.status === 'sin-token' ? 'Sin token GitHub' : 'Revisar permisos del token'}</small>
              </article>
            ))}
            <article className="workflow-step is-ok">
              <span>5</span>
              <strong>Redes gratis</strong>
              <p>Instagram oficial del negocio</p>
              <small>{workflowStatus.automation.manualSocialReady ? 'Kit manual listo, sin suscripción' : 'Revisar publicación manual'}</small>
            </article>
            <article className={workflowStatus.automation.deployHookConfigured ? 'workflow-step is-ok' : 'workflow-step is-warning'}>
              <span>6</span>
              <strong>Redeploy</strong>
              <p>Actualización automática web</p>
              <small>{workflowStatus.automation.deployHookConfigured ? 'Deploy Hook configurado' : 'Deploy Hook pendiente'}</small>
            </article>
          </div>
        ) : (
          <p className="status-line">Cargando diagnóstico del workflow...</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow admin-eyebrow">Oferta automática</p>
            <h2>Nueva oferta de comida</h2>
          </div>
          <span className="pill">Foto + WhatsApp + redes</span>
        </div>
        <div className="offer-form">
          <label>Título<input value={offerForm.titulo} onChange={(event) => setOfferForm({ ...offerForm, titulo: event.target.value })} /></label>
          <label>Descripción<textarea value={offerForm.descripcion} onChange={(event) => setOfferForm({ ...offerForm, descripcion: event.target.value })} /></label>
          <label>Imagen de oferta<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && run(async () => setOfferImage(await compressImage(event.target.files![0])))} /></label>
          <div className="preview-card">
            <div className="image-preview">{offerImage ? <img src={offerImage} alt="Vista previa" /> : 'Imagen comprimida para celular'}</div>
          </div>
          <div className="date-grid">
            <label>Desde DD/MM/AAAA<input value={offerForm.fecha_inicio} onChange={(event) => setOfferForm({ ...offerForm, fecha_inicio: event.target.value })} placeholder="07/06/2026" /></label>
            <label>Hasta DD/MM/AAAA<input value={offerForm.fecha_fin} onChange={(event) => setOfferForm({ ...offerForm, fecha_fin: event.target.value })} placeholder="15/06/2026" /></label>
          </div>
          <fieldset className="social-box social-box--highlight">
            <legend>Destinos para publicar en redes</legend>
            {(Object.keys(socialNetworkLabels) as SocialNetwork[]).map((network) => (
              <label key={network}>
                <input
                  type="checkbox"
                  checked={socialNetworks.includes(network)}
                  onChange={() => toggleNetwork(network)}
                />
                {socialNetworkLabels[network]}
              </label>
            ))}
            {socialNetworks.includes('instagram') && (
              <div className="instagram-targets">
                <strong>Cuentas Instagram destino</strong>
                {(Object.keys(instagramAccountLabels) as InstagramAccountKey[]).map((account) => (
                  <label key={account}>
                    <input
                      type="checkbox"
                      checked={instagramAccounts.includes(account)}
                      onChange={() => toggleInstagramAccount(account)}
                    />
                    {instagramAccountLabels[account]}
                  </label>
                ))}
              </div>
            )}
            <p className="social-note">
              Primero guarda la oferta. Luego usa "Publicar redes" en su tarjeta para copiar el caption, descargar la imagen y abrir las cuentas oficiales.
            </p>
          </fieldset>
          {offerForm.titulo && (
            <div className="caption-preview">
              <strong>Caption listo para redes</strong>
              <pre>{buildSocialCaption({
                title: offerForm.titulo,
                description: offerForm.descripcion,
                endsAt: offerForm.fecha_fin || '15/06/2026',
                publicUrl: 'https://antojosbarlounge.com/#ofertas-antojos',
              })}</pre>
            </div>
          )}
          <div className="split-actions">
            <button className="primary-btn" type="button" onClick={() => run(addOffer)}>1. Guardar oferta</button>
            <button className="secondary-btn" type="button" onClick={() => run(deploySite)}>2. Actualizar web</button>
          </div>
        </div>
      </section>

      <section className="panel offers-panel">
        <div className="panel-title-row">
          <h2>Ofertas publicadas</h2>
          <span className="pill">{offers.length} ofertas</span>
        </div>
        <div className="cards-grid">
          {offers.map((offer) => (
            <article className="offer-card" key={offer.id}>
              {offer.imagen_base64 ? <img src={offer.imagen_base64} alt={offer.titulo} /> : <div className="offer-placeholder">Antojos</div>}
              <div className="offer-card__body">
                <h3>{offer.titulo}</h3>
                <p>{offer.descripcion}</p>
                <p>{offer.fecha_inicio} - {offer.fecha_fin}</p>
                <div className="offer-actions">
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => openOfferWhatsApp(offer)}
                  >
                    WhatsApp
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => run(() => copyOfferCaption(offer))}
                  >
                    Copiar caption
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => run(() => publishOfferSocial(offer))}
                  >
                    Publicar redes
                  </button>
                  <button className="danger-btn" type="button" onClick={() => run(() => saveOffers(offers.filter((entry) => entry.id !== offer.id)))}>Eliminar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <EditableItems
        title="Menú digital del lavadero"
        items={washServices}
        setItems={setWashServices}
        onSave={() => run(saveWash)}
        newCategory="Lavado Normal Exterior"
      />

      <EditableItems
        title="Menú digital del restaurante y mercancías"
        items={menuItems}
        setItems={setMenuItems}
        onSave={() => run(saveMenu)}
        newCategory="Picaderas"
      />
    </>
  );
}

function MoneyInput({
  value,
  onChange,
  ariaLabel,
}: {
  value?: number | null;
  onChange: (value: number | null) => void;
  ariaLabel: string;
}) {
  const isFocused = useRef(false);
  const [displayValue, setDisplayValue] = useState(() => formatDopAdminInput(value));

  useEffect(() => {
    if (!isFocused.current) {
      setDisplayValue(formatDopAdminInput(value));
    }
  }, [value]);

  return (
    <input
      aria-label={ariaLabel}
      inputMode="decimal"
      placeholder="200.00"
      type="text"
      value={displayValue}
      onFocus={() => {
        isFocused.current = true;
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDisplayValue(nextValue);
        try {
          onChange(parseDopInputToCents(nextValue));
        } catch {
          // Keep the typed value visible until blur; the last valid cents value remains intact.
        }
      }}
      onBlur={() => {
        isFocused.current = false;
        try {
          const cents = parseDopInputToCents(displayValue);
          onChange(cents);
          setDisplayValue(formatDopAdminInput(cents));
        } catch {
          setDisplayValue(formatDopAdminInput(value));
        }
      }}
    />
  );
}

function EditableItems<T extends MenuItem>({
  title,
  items,
  setItems,
  onSave,
  newCategory,
}: {
  title: string;
  items: T[];
  setItems: (items: T[]) => void;
  onSave: () => void;
  newCategory: string;
}) {
  function update(id: string, patch: Partial<T>) {
    setItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addItem() {
    const id = `nuevo-${Date.now()}`;
    setItems([
      ...items,
      {
        id,
        categoria: newCategory,
        nombre: 'Nuevo artículo',
        etiqueta: 'Consultar en caja',
        disponible: true,
        orden: items.length + 1,
      } as T,
    ]);
  }

  return (
    <section className="panel">
      <div className="panel-title-row">
        <h2>{title}</h2>
        <div className="button-row" style={{ marginTop: 0 }}>
          <button className="secondary-btn" onClick={addItem}>Agregar artículo</button>
          <button className="primary-btn" onClick={onSave}>Guardar cambios</button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Etiqueta</th>
              <th>Visible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><input value={item.nombre} onChange={(event) => update(item.id, { nombre: event.target.value } as Partial<T>)} /></td>
                <td><input value={item.categoria} onChange={(event) => update(item.id, { categoria: event.target.value } as Partial<T>)} /></td>
                <td>
                  <MoneyInput
                    ariaLabel={`Precio de ${item.nombre}`}
                    value={item.precio_centavos}
                    onChange={(price) => update(item.id, { precio_centavos: price } as Partial<T>)}
                  />
                </td>
                <td>
                  <MoneyInput
                    ariaLabel={`Precio desde de ${item.nombre}`}
                    value={item.precio_min_centavos}
                    onChange={(price) => update(item.id, { precio_min_centavos: price } as Partial<T>)}
                  />
                </td>
                <td>
                  <MoneyInput
                    ariaLabel={`Precio hasta de ${item.nombre}`}
                    value={item.precio_max_centavos}
                    onChange={(price) => update(item.id, { precio_max_centavos: price } as Partial<T>)}
                  />
                </td>
                <td><input value={item.etiqueta ?? ''} onChange={(event) => update(item.id, { etiqueta: event.target.value || null } as Partial<T>)} /></td>
                <td><input type="checkbox" checked={item.disponible} onChange={(event) => update(item.id, { disponible: event.target.checked } as Partial<T>)} /></td>
                <td><button className="danger-btn" onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}>Quitar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
