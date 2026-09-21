type ServiceType = "graphic_design" | "website_development" | "both";
type PaymentMode = "deposit" | "full" | "balance";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

interface GraphicService {
  id: string;
  label: string;
  price: number;
}

interface ServicePayment {
  id: string;
  serviceType: ServiceType;
  customerName: string;
  customerEmail: string | null;
  description: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateResponse {
  success: boolean;
  reference: string;
  checkoutUrl: string;
  servicePayment: ServicePayment;
}

interface StatusResponse {
  success: boolean;
  servicePayment: ServicePayment | null;
}

const GRAPHIC_SERVICES: GraphicService[] = [
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

const SERVICE_LABELS: Record<ServiceType, string> = {
  graphic_design: "Graphic Design",
  website_development: "Website Development",
  both: "Graphic Design + Web Development",
};

const API_BASE_URL = String(
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_BUYMESHO_API_BASE_URL ?? "",
).replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

function formatMoney(amount: number, currency = "MWK") {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

