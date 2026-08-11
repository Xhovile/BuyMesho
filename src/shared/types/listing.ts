import type { EntityId, ISODateString, MoneyValue, Timestamped } from './common';

export type ListingStatus = 'draft' | 'active' | 'paused' | 'sold' | 'expired' | 'removed';
export type ListingKind = 'product' | 'service' | 'accommodation' | 'event' | 'wholesale';

export interface ListingImage {
  url: string;
  alt?: string;
  order: number;
}

export interface ListingCategory {
  id: EntityId;
  name: string;
  slug: string;
}

export interface Listing extends Timestamped {
  id: EntityId;
  sellerId: EntityId;
  title: string;
  slug: string;
  description: string;
  kind: ListingKind;
  category: ListingCategory;
  status: ListingStatus;
  price: MoneyValue;
  campusId?: string | null;
  universityId?: string | null;
  images: ListingImage[];
  publishedAt?: ISODateString | null;
  expiresAt?: ISODateString | null;
}

export interface ListingFilters {
  search?: string;
  campusId?: string;
  categoryId?: string;
  kind?: ListingKind;
  minPrice?: number;
  maxPrice?: number;
  status?: ListingStatus;
}
