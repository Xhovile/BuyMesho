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

export interface Seller {
  uid: string;
  email: string;
  business_name: string;
  business_logo: string;
  university: University;
  bio?: string;
  is_verified: boolean;
  join_date: string;
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
  whatsapp_number: string;
  created_at: string;
  // Joined fields
  business_name: string;
  business_logo: string;
  is_verified: boolean;
}
