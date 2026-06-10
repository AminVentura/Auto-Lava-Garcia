export type Offer = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
  sortOrder: number;
};

export type PriceValue = {
  priceCents?: number | null;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  displayLabel?: string | null;
};

export type MenuItem = PriceValue & {
  id: string;
  category: string;
  name: string;
  description?: string | null;
  isAvailable: boolean;
  sortOrder: number;
};

export type WashService = PriceValue & {
  id: string;
  category: string;
  vehicleType?: string | null;
  name: string;
  isAvailable: boolean;
  sortOrder: number;
};
