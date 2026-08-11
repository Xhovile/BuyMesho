import { type ElementType } from "react";

export type FeaturedSection = {
  key: string;
  title: string;
  description: string;
  icon: ElementType;
  apiCategory: string;
};

export type SectionListing = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
  category?: string;
  university?: string;
  seller_uid?: string;
  listing_mode?: "normal" | "deal" | "wholesale";
  original_price?: number | null;
  discount_percent?: number | null;
  deal_label?: string | null;
  is_wholesale?: boolean;
  pack_size?: number | null;
};

export type HomeEventPreview = {
  id: number;
  event_type: string;
  event_title: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  ticket_mode: string;
  ticket_price: number | null;
  ticket_link: string | null;
  description: string;
  poster_alt: string | null;
  spec_values: Record<string, unknown>;
};

export type ListingStripVariant = "featured" | "supporting";
