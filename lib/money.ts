import type { PriceValue } from './types';

function centsToPesoText(cents: number): string {
  const pesos = cents / 100;
  return pesos.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseDopInputToCents(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/^RD\$\s*/i, '')
    .replace(/,/g, '');

  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    throw new Error('El precio debe ser un monto en pesos con hasta 2 decimales.');
  }

  const [pesoText, centText = ''] = normalized.split('.');
  return Number(pesoText) * 100 + Number(centText.padEnd(2, '0'));
}

export function formatDopAdminInput(cents?: number | null): string {
  if (cents == null) return '';
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error('El precio guardado debe estar en centavos enteros.');
  }
  return (cents / 100).toFixed(2);
}

export function formatDopPrice(value: PriceValue): string {
  if (value.displayLabel?.trim()) return value.displayLabel.trim();

  if (typeof value.priceCents === 'number') {
    return `RD$${centsToPesoText(value.priceCents)}`;
  }

  if (typeof value.minPriceCents === 'number' && typeof value.maxPriceCents === 'number') {
    return `RD$${centsToPesoText(value.minPriceCents)}-${centsToPesoText(value.maxPriceCents)}`;
  }

  if (typeof value.minPriceCents === 'number') {
    return `RD$${centsToPesoText(value.minPriceCents)}+`;
  }

  return 'Consultar en oficina';
}
