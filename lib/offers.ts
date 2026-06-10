import type { Offer } from './types';

function startOfLocalDate(value: string): Date {
  return new Date(`${value}T00:00:00-04:00`);
}

function endOfLocalDate(value: string): Date {
  return new Date(`${value}T23:59:59-04:00`);
}

export function getActiveOffers(offers: Offer[], now = new Date()): Offer[] {
  return offers
    .filter((offer) => {
      if (!offer.isPublished) return false;
      return startOfLocalDate(offer.startsAt) <= now && now <= endOfLocalDate(offer.endsAt);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'es'));
}

export function isOfferExpired(offer: Offer, now = new Date()): boolean {
  return now > endOfLocalDate(offer.endsAt);
}
