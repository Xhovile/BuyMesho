export interface GraphicService {
  id: string;
  label: string;
  price: number;
}

export const MIN_WEBSITE_PROJECT_TOTAL = 80_000;

export const GRAPHIC_SERVICES: GraphicService[] = [
  { id: "music_artwork", label: "Music Artwork", price: 5500 },
  { id: "flyer", label: "Flyer", price: 6500 },
  { id: "wedding_card", label: "Wedding Card", price: 7500 },
  { id: "business_card", label: "Business Card", price: 7500 },
  { id: "birthday_card", label: "Birthday Card", price: 7500 },
  { id: "poster", label: "Poster", price: 9500 },
  { id: "logo_design", label: "Logo Design", price: 9500 },
  { id: "tshirt_design", label: "T-Shirt Design", price: 9500 },
  { id: "sticker_design", label: "Sticker Design", price: 9500 },
  { id: "album_cover", label: "Album Cover", price: 9500 },
  { id: "book_cover", label: "Book Cover", price: 9500 },
  { id: "banner_design", label: "Banner Design", price: 10500 },
];

export const GRAPHIC_SERVICE_PRICE_MAP: Record<string, number> = Object.fromEntries(
  GRAPHIC_SERVICES.map((service) => [service.id, service.price]),
);
