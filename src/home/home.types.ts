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
};

export type ListingStripVariant = "featured" | "supporting";
