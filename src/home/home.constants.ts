import {
  BookOpen,
  ShoppingBag,
  Smartphone,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import type { FeaturedSection } from "./home.types";

export const HOME_CATEGORY_KEYS = {
  phones: "phones",
  fashion: "fashion",
  books: "books",
  food: "food",
  beauty: "beauty",
} as const;

export const featuredSections: FeaturedSection[] = [
  {
    key: HOME_CATEGORY_KEYS.phones,
    title: "Featured Gadgets",
    description: "Popular devices and accessories students check first.",
    icon: Smartphone,
    apiCategory: "Electronics & Gadgets",
  },
  {
    key: HOME_CATEGORY_KEYS.fashion,
    title: "Trending Fashion",
    description: "Style items moving quickly inside campus communities.",
    icon: ShoppingBag,
    apiCategory: "Fashion & Clothing",
  },
  {
    key: HOME_CATEGORY_KEYS.books,
    title: "Study Essentials",
    description: "Academic items useful for class, exams, and assignments.",
    icon: BookOpen,
    apiCategory: "Academic Services",
  },
  {
    key: HOME_CATEGORY_KEYS.food,
    title: "Eatery & Fast Foods",
    description: "Quick meals, snacks, and drinks students check often.",
    icon: UtensilsCrossed,
    apiCategory: "Food & Snacks",
  },
  {
    key: HOME_CATEGORY_KEYS.beauty,
    title: "Beauty & Personal Care",
    description: "Skincare, hair care, fragrances, and personal care essentials.",
    icon: Sparkles,
    apiCategory: "Beauty & Personal Care",
  },
];

export const trustPills = ["For everyone", "Growing student entrepreneurs"] as const;
