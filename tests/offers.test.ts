import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getActiveOffers } from '@/lib/offers';
import { getAdminSaveConfigStatus } from '@/lib/admin-save-config';
import { getAdminErrorMessage } from '@/lib/admin-http';
import { buildGithubContentsPutBody } from '@/lib/github-contents';
import { formatDopAdminInput, formatDopPrice, parseDopInputToCents } from '@/lib/money';
import { buildInstagramTargets, buildSocialCaption, buildWhatsAppOfferUrl } from '@/lib/social';
import {
  getActiveStaticOffers,
  isoDateToRd,
  normalizeStaticOffers,
  rdDateToIso,
  menuItemsByCategory,
  washServicesByCategory,
} from '@/lib/static-data';

const root = new URL('../', import.meta.url);

describe('offer visibility', () => {
  it('returns only published offers inside their date window', () => {
    const offers = [
      {
        id: 'active',
        title: 'Yaroa de papa + refresco',
        description: 'Combo Antojos',
        imageUrl: '/assets/yaroa.png',
        startsAt: '2026-06-01',
        endsAt: '2026-06-30',
        isPublished: true,
        sortOrder: 2,
      },
      {
        id: 'draft',
        title: 'Draft',
        description: '',
        imageUrl: '/assets/draft.png',
        startsAt: '2026-06-01',
        endsAt: '2026-06-30',
        isPublished: false,
        sortOrder: 1,
      },
      {
        id: 'expired',
        title: 'Expired',
        description: '',
        imageUrl: '/assets/expired.png',
        startsAt: '2026-05-01',
        endsAt: '2026-05-31',
        isPublished: true,
        sortOrder: 0,
      },
    ];

    expect(getActiveOffers(offers, new Date('2026-06-15T12:00:00-04:00'))).toEqual([
      offers[0],
    ]);
  });

  it('sorts active offers by sortOrder and then title', () => {
    const offers = [
      {
        id: 'b',
        title: 'Pechuga a la crema',
        description: '',
        imageUrl: '/assets/pechuga.png',
        startsAt: '2026-06-01',
        endsAt: '2026-06-30',
        isPublished: true,
        sortOrder: 5,
      },
      {
        id: 'a',
        title: 'Yaroa de papa',
        description: '',
        imageUrl: '/assets/yaroa.png',
        startsAt: '2026-06-01',
        endsAt: '2026-06-30',
        isPublished: true,
        sortOrder: 1,
      },
    ];

    expect(getActiveOffers(offers, new Date('2026-06-15T12:00:00-04:00')).map((offer) => offer.id)).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('money formatting', () => {
  it('formats Dominican peso cents with fixed cents for the public page', () => {
    expect(formatDopPrice({ priceCents: 25000 })).toBe('RD$250.00');
    expect(formatDopPrice({ minPriceCents: 20000, maxPriceCents: 25000 })).toBe('RD$200.00-250.00');
    expect(formatDopPrice({ displayLabel: 'Consultar en oficina' })).toBe('Consultar en oficina');
  });

  it('lets the admin type pesos while saving integer cents', () => {
    expect(parseDopInputToCents('200')).toBe(20000);
    expect(parseDopInputToCents('200.00')).toBe(20000);
    expect(parseDopInputToCents('1,250.50')).toBe(125050);
    expect(parseDopInputToCents('')).toBeNull();
    expect(formatDopAdminInput(40000)).toBe('400.00');
  });
});

describe('manual social sharing', () => {
  it('builds a Spanish caption with expiration and public URL', () => {
    const caption = buildSocialCaption({
      title: 'Pechuga a la crema con tostones',
      description: 'Oferta especial de la casa',
      endsAt: '2026-06-30',
      publicUrl: 'https://antojosbarlounge.com/#ofertas-antojos',
    });

    expect(caption).toContain('Pechuga a la crema con tostones');
    expect(caption).toContain('Disponible hasta el 30/6/2026');
    expect(caption).toContain('https://antojosbarlounge.com/#ofertas-antojos');
  });

  it('builds a caption when the admin uses Dominican date format', () => {
    const caption = buildSocialCaption({
      title: 'Yaroa de papa + 1 refresco',
      description: 'Oferta con imagen para redes',
      endsAt: '15/06/2026',
      publicUrl: 'https://antojosbarlounge.com/#ofertas-antojos',
    });

    expect(caption).toContain('Disponible hasta el 15/6/2026');
  });

  it('builds a WhatsApp URL for ordering an offer manually', () => {
    const url = buildWhatsAppOfferUrl({
      phone: '18097941824',
      title: 'Yaroa de papa + 1 refresco',
      publicUrl: 'https://antojosbarlounge.com/#ofertas-antojos',
    });

    expect(url).toMatch(/^https:\/\/wa\.me\/18097941824\?text=/);
    expect(decodeURIComponent(url)).toContain('Yaroa de papa + 1 refresco');
  });

  it('builds selected Instagram account targets for manual publishing', () => {
    expect(buildInstagramTargets(['autolavagarcia', 'antojosbarlounge'])).toEqual([
      {
        handle: 'AutoLavaGarcia',
        url: 'https://instagram.com/AutoLavaGarcia',
      },
      {
        handle: 'antojosbarlounge',
        url: 'https://instagram.com/antojosbarlounge',
      },
    ]);
  });
});

describe('static JSON data contract', () => {
  it('keeps every active public offer with a real saved image', () => {
    const data = JSON.parse(readFileSync(new URL('data/ofertas.json', root), 'utf8')) as { ofertas: unknown[] };
    const activeOffers = getActiveStaticOffers(
      normalizeStaticOffers(data.ofertas),
      new Date('2026-06-08T12:00:00-04:00'),
    );

    expect(activeOffers.length).toBeGreaterThan(0);
    expect(activeOffers.every((offer) => offer.imagen_base64.startsWith('data:image/'))).toBe(true);
  });

  it('renders public offer photos complete and keeps the WhatsApp CTA text visible', () => {
    const publicStyles = readFileSync(new URL('public/css/styles.css', root), 'utf8');
    const legacyStyles = readFileSync(new URL('css/styles.css', root), 'utf8');
    const publicScript = readFileSync(new URL('public/js/main.js', root), 'utf8');
    const legacyScript = readFileSync(new URL('js/main.js', root), 'utf8');

    [publicStyles, legacyStyles].forEach((styles) => {
      expect(styles).toMatch(/\.oferta-card img\s*\{[\s\S]*object-fit:\s*contain;/);
      expect(styles).toMatch(/\.oferta-card__cta\s*\{[\s\S]*color:\s*#1d1300\s*!important;/);
      expect(styles).toMatch(/\.oferta-card__cta\s*\{[\s\S]*white-space:\s*nowrap;/);
    });

    expect(publicScript).toContain('Ordenar por WhatsApp');
    expect(legacyScript).toContain('Ordenar por WhatsApp');
    expect(publicScript).toContain('backfillOfferImages');
    expect(publicScript).toContain('backfillStaticPrices');
    expect(publicScript).toContain('hasSuspiciousPesoPrice');
    expect(legacyScript).toContain('backfillOfferImages');
  });

  it('converts required Dominican dates without accepting invalid dates', () => {
    expect(rdDateToIso('07/06/2026')).toBe('2026-06-07');
    expect(isoDateToRd('2026-06-15')).toBe('15/06/2026');
    expect(() => rdDateToIso('2026-06-07')).toThrow('DD/MM/AAAA');
    expect(() => rdDateToIso('31/02/2026')).toThrow('fecha RD inválida');
  });

  it('normalizes static offers and excludes expired entries from the public DOM', () => {
    const offers = normalizeStaticOffers([
      {
        id: 'vigente',
        titulo: 'Yaroa especial',
        descripcion: 'Oferta del lounge',
        imagen_base64: 'data:image/webp;base64,AAAA',
        fecha_inicio: '07/06/2026',
        fecha_fin: '15/06/2026',
        publicada: true,
        orden: 2,
      },
      {
        id: 'vencida',
        titulo: 'Oferta vencida',
        fecha_inicio: '01/06/2026',
        fecha_fin: '05/06/2026',
        publicada: true,
        orden: 1,
      },
    ]);

    expect(getActiveStaticOffers(offers, new Date('2026-06-10T12:00:00-04:00')).map((offer) => offer.id)).toEqual(['vigente']);
  });

  it('groups wash services by category using integer cents', () => {
    const grouped = washServicesByCategory([
      {
        id: 'lavado-normal-carro',
        categoria: 'Lavado Normal Exterior',
        nombre: 'Lavado Normal Carro',
        precio_centavos: 30000,
        disponible: true,
        orden: 1,
      },
      {
        id: 'interior-crema',
        categoria: 'Servicios Premium',
        nombre: 'Interior crema',
        precio_min_centavos: 40000,
        disponible: true,
        orden: 2,
      },
    ]);

    expect(grouped).toEqual([
      {
        category: 'Lavado Normal Exterior',
        services: [{ id: 'lavado-normal-carro', name: 'Lavado Normal Carro', priceText: 'RD$300.00' }],
      },
      {
        category: 'Servicios Premium',
        services: [{ id: 'interior-crema', name: 'Interior crema', priceText: 'RD$400.00+' }],
      },
    ]);
  });

  it('groups restaurant menu items by category and keeps merchandise editable', () => {
    const grouped = menuItemsByCategory([
      {
        id: 'empanadas',
        categoria: 'Picaderas',
        nombre: 'Empanadas',
        precio_centavos: 7500,
        disponible: true,
        orden: 1,
      },
      {
        id: 'ambientador-pino',
        categoria: 'Mercancías',
        nombre: 'Ambientador pino',
        etiqueta: 'Consultar en caja',
        disponible: true,
        orden: 2,
      },
      {
        id: 'oculto',
        categoria: 'Mercancías',
        nombre: 'Oculto',
        precio_centavos: 10000,
        disponible: false,
        orden: 3,
      },
    ]);

    expect(grouped).toEqual([
      {
        category: 'Picaderas',
        items: [{ id: 'empanadas', name: 'Empanadas', priceText: 'RD$75.00' }],
      },
      {
        category: 'Mercancías',
        items: [{ id: 'ambientador-pino', name: 'Ambientador pino', priceText: 'Consultar en caja' }],
      },
    ]);
  });
});

describe('admin save configuration', () => {
  it('detects a missing GitHub token and a token pasted as an env var name', () => {
    const status = getAdminSaveConfigStatus({
      ADMIN_GITHUB_OWNER: 'AminVentura',
      ADMIN_GITHUB_REPO: 'Auto-Lava-Garcia',
      ADMIN_GITHUB_BRANCH: 'main',
      ghp_exampleTokenAccidentallyUsedAsName: 'Encrypted',
    });

    expect(status.ok).toBe(false);
    expect(status.missing).toEqual(['ADMIN_GITHUB_TOKEN']);
    expect(status.warning).toContain('token fue guardado como nombre de variable');
  });

  it('omits sha when GitHub Contents API needs to create a missing JSON file', () => {
    expect(buildGithubContentsPutBody({
      message: 'chore: actualizar ofertas desde admin',
      content: 'eyJvZmVydGFzIjpbXX0=',
      branch: 'main',
      sha: null,
    })).toEqual({
      message: 'chore: actualizar ofertas desde admin',
      content: 'eyJvZmVydGFzIjpbXX0=',
      branch: 'main',
    });
  });

  it('turns non-JSON admin errors into readable messages', () => {
    expect(getAdminErrorMessage(404, 'text/plain; charset=utf-8', 'The page could not be found')).toBe(
      'No se pudo guardar. Código 404: The page could not be found',
    );
  });
});
