export type University = 
  | "MUBAS" 
  | "LUANAR" 
  | "MZUNI" 
  | "UNIMA" 
  | "MUST" 
  | "Catholic University (CU)" 
  | "Livingstonia" 
  | "MAGU";

export type Category = 
  | "Food & Snacks" 
  | "Fashion & Clothing" 
  | "Academic Services" 
  | "Electronics & Gadgets" 
  | "Beauty & Personal Care";

export type ListingStatus = "available" | "sold";
export type ListingCondition = "new" | "used" | "refurbished";

export interface UserProfile {
  uid: string;
  email: string;
  is_seller: boolean;
  is_verified: boolean;
  join_date: string;

  // general user fields
  university?: University;
  avatar_url?: string;

  // seller-only fields
  business_name?: string;
  business_logo?: string;
  bio?: string;
  whatsapp_number?: string;
}

export interface Listing {
  id: number;
  seller_uid: string;
  name: string;
  price: number;
  description: string;
  category: Category;
  university: University;
  photos: string[];
  video_url?: string | null;
  whatsapp_number: string;
  status: ListingStatus;
  condition?: ListingCondition;
  created_at: string;
  updated_at?: string;
  views_count?: number;
  whatsapp_clicks?: number;
  is_hidden?: number;
  business_name: string;
  business_logo: string;
  is_verified: boolean;
}

export interface SellerDashboardData {
  seller: {
    uid: string;
    business_name: string | null;
    profile_views: number;
  };
  stats: {
    total_listings: number;
    active_listings: number;
    sold_listings: number;
    total_views: number;
    total_whatsapp_clicks: number;
    repeat_seller_activity: boolean;
  };
  byCampus: {
    university: string;
    count: number;
  }[];
  top_listing: {
    id: number;
    name: string;
    views_count: number;
    whatsapp_clicks: number;
    status: string;
    created_at: string;
  } | null;
}

export interface RatingSummary {
  averageRating: number;
  ratingCount: number;
  myRating: number | null;
}
