type CaptionInput = {
  title: string;
  description?: string | null;
  endsAt: string;
  publicUrl: string;
};

type WhatsAppOfferInput = {
  phone: string;
  title: string;
  publicUrl: string;
};

export type InstagramAccountKey = 'autolavagarcia' | 'antojosbarlounge';

export type InstagramTarget = {
  handle: string;
  url: string;
};

const instagramTargets: Record<InstagramAccountKey, InstagramTarget> = {
  autolavagarcia: {
    handle: 'AutoLavaGarcia',
    url: 'https://instagram.com/AutoLavaGarcia',
  },
  antojosbarlounge: {
    handle: 'antojosbarlounge',
    url: 'https://instagram.com/antojosbarlounge',
  },
};

function formatDate(value: string): string {
  const rdMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const [year, month, day] = rdMatch
    ? [Number(rdMatch[3]), Number(rdMatch[2]), Number(rdMatch[1])]
    : value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toLocaleDateString('es-DO');
}

export function buildSocialCaption(input: CaptionInput): string {
  const lines = [
    `Oferta especial de Antojos Bar Lounge: ${input.title}`,
    input.description?.trim() || null,
    `Disponible hasta el ${formatDate(input.endsAt)}.`,
    'Ven y disfrútalo en Santiago de los Caballeros.',
    input.publicUrl,
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildInstagramTargets(accounts: InstagramAccountKey[]): InstagramTarget[] {
  return accounts.map((account) => instagramTargets[account]);
}

export function buildWhatsAppOfferUrl(input: WhatsAppOfferInput): string {
  const text = `Hola, quiero ordenar o preguntar por esta oferta: ${input.title}\n${input.publicUrl}`;
  return `https://wa.me/${input.phone}?text=${encodeURIComponent(text)}`;
}
