export type StaticOffer = {
  id: string;
  titulo: string;
  descripcion: string;
  imagen_base64: string;
  fecha_inicio: string;
  fecha_fin: string;
  publicada: boolean;
  orden: number;
};

export type StaticWashService = {
  id: string;
  categoria: string;
  nombre: string;
  precio_centavos?: number | null;
  precio_min_centavos?: number | null;
  precio_max_centavos?: number | null;
  etiqueta?: string | null;
  disponible: boolean;
  orden: number;
};

export type StaticMenuItem = {
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

export type PublicWashGroup = {
  category: string;
  services: Array<{
    id: string;
    name: string;
    priceText: string;
  }>;
};

export type PublicMenuGroup = {
  category: string;
  items: Array<{
    id: string;
    name: string;
    priceText: string;
  }>;
};

function assertIntegerCents(value: unknown, field: string): number | null {
  if (value == null || value === '') return null;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${field} debe estar en centavos enteros`);
  }
  return numberValue;
}

function centsToPesoText(cents: number): string {
  const pesos = cents / 100;
  return pesos.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function staticPriceText(service: StaticWashService): string {
  if (service.etiqueta?.trim()) return service.etiqueta.trim();
  if (typeof service.precio_centavos === 'number') return `RD$${centsToPesoText(service.precio_centavos)}`;
  if (typeof service.precio_min_centavos === 'number' && typeof service.precio_max_centavos === 'number') {
    return `RD$${centsToPesoText(service.precio_min_centavos)}-${centsToPesoText(service.precio_max_centavos)}`;
  }
  if (typeof service.precio_min_centavos === 'number') return `RD$${centsToPesoText(service.precio_min_centavos)}+`;
  return 'Consultar en oficina';
}

function staticMenuPriceText(item: StaticMenuItem): string {
  if (item.etiqueta?.trim()) return item.etiqueta.trim();
  if (typeof item.precio_centavos === 'number') return `RD$${centsToPesoText(item.precio_centavos)}`;
  if (typeof item.precio_min_centavos === 'number' && typeof item.precio_max_centavos === 'number') {
    return `RD$${centsToPesoText(item.precio_min_centavos)}-${centsToPesoText(item.precio_max_centavos)}`;
  }
  if (typeof item.precio_min_centavos === 'number') return `RD$${centsToPesoText(item.precio_min_centavos)}+`;
  return 'Consultar en caja';
}

export function rdDateToIso(value: string): string {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error('La fecha debe estar en formato RD DD/MM/AAAA');

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day, 12, 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('La fecha RD inválida no puede guardarse');
  }

  return `${yearText}-${monthText}-${dayText}`;
}

export function isoDateToRd(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('La fecha debe estar en formato ISO AAAA-MM-DD');
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function normalizeStaticOffers(input: unknown[]): StaticOffer[] {
  return input
    .map((entry, index) => {
      const value = entry as Record<string, unknown>;
      const fechaInicio = String(value.fecha_inicio ?? '');
      const fechaFin = String(value.fecha_fin ?? '');
      rdDateToIso(fechaInicio);
      rdDateToIso(fechaFin);

      return {
        id: String(value.id ?? '').trim(),
        titulo: String(value.titulo ?? '').trim(),
        descripcion: String(value.descripcion ?? '').trim(),
        imagen_base64: String(value.imagen_base64 ?? '').trim(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        publicada: Boolean(value.publicada),
        orden: Number.isInteger(value.orden) ? Number(value.orden) : index + 1,
      };
    })
    .filter((offer) => offer.id && offer.titulo);
}

export function getActiveStaticOffers(offers: StaticOffer[], now = new Date()): StaticOffer[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  return offers
    .filter((offer) => {
      if (!offer.publicada) return false;
      const start = new Date(`${rdDateToIso(offer.fecha_inicio)}T12:00:00`);
      const end = new Date(`${rdDateToIso(offer.fecha_fin)}T23:59:59`);
      return start <= today && today <= end;
    })
    .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es'));
}

export function washServicesByCategory(input: StaticWashService[]): PublicWashGroup[] {
  const groups = new Map<string, PublicWashGroup>();

  input
    .filter((service) => service.disponible)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
    .forEach((service) => {
      const normalized = {
        ...service,
        precio_centavos: assertIntegerCents(service.precio_centavos, 'precio_centavos'),
        precio_min_centavos: assertIntegerCents(service.precio_min_centavos, 'precio_min_centavos'),
        precio_max_centavos: assertIntegerCents(service.precio_max_centavos, 'precio_max_centavos'),
      };
      if (!groups.has(service.categoria)) {
        groups.set(service.categoria, { category: service.categoria, services: [] });
      }
      groups.get(service.categoria)?.services.push({
        id: service.id,
        name: service.nombre,
        priceText: staticPriceText(normalized),
      });
    });

  return Array.from(groups.values());
}

export function menuItemsByCategory(input: StaticMenuItem[]): PublicMenuGroup[] {
  const groups = new Map<string, PublicMenuGroup>();

  input
    .filter((item) => item.disponible)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
    .forEach((item) => {
      const normalized = {
        ...item,
        precio_centavos: assertIntegerCents(item.precio_centavos, 'precio_centavos'),
        precio_min_centavos: assertIntegerCents(item.precio_min_centavos, 'precio_min_centavos'),
        precio_max_centavos: assertIntegerCents(item.precio_max_centavos, 'precio_max_centavos'),
      };
      if (!groups.has(item.categoria)) {
        groups.set(item.categoria, { category: item.categoria, items: [] });
      }
      groups.get(item.categoria)?.items.push({
        id: item.id,
        name: item.nombre,
        priceText: staticMenuPriceText(normalized),
      });
    });

  return Array.from(groups.values());
}
