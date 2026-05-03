import { UNIVERSITIES } from "./constants";

export type University = (typeof UNIVERSITIES)[number];

export type Category =
  | "Food & Snacks"
  | "Fashion & Clothing"
  | "Academic Services"
  | "Electronics & Gadgets"
  | "Beauty & Personal Care";

export type ListingMode = "normal" | "deal" | "wholesale";

export type ListingStatus = "available" | "sold";
export type ListingCondition = "new" | "used" | "refurbished";
export type ListingMode = "normal" | "deal" | "wholesale";
export type VisibilitySetting = "everyone" | "students_only" | "only_me";
export type ListingSpecValue = string | number | boolean | string[] | null;
export type ListingSpecValues = Record<string, ListingSpecValue>;

export interface ListingDraft {
  name: string;
  price: string;
  description: string;
  category: Category;
  subcategory: string;
  item_type: string;
  spec_values: ListingSpecValues;
  university: University;
  photos: string[];
  video_url: string;
  whatsapp_number: string;
  status: ListingStatus;
  condition: ListingCondition;
  quantity: string;
  sold_quantity: string;
  listing_mode?: ListingMode;
  original_price?: string;
  discount_percent?: string;
  deal_label?: string;
  deal_expires_at?: string;
  is_wholesale?: boolean;
  can_sell_individually?: boolean;
  pack_size?: string;
  bulk_units?: string;
}

export interface CreateListingPayload {
  name: string;
  price: number;
  description: string;
  category: Category;
  subcategory?: string | null;
  item_type?: string | null;
  spec_values?: ListingSpecValues;
  university: University;
  photos: string[];
  video_url?: string | null;
  whatsapp_number: string;
  status: ListingStatus;
  condition: ListingCondition;
  quantity: number;
  sold_quantity: number;
  listing_mode?: ListingMode;
  original_price?: number | null;
  discount_percent?: number | null;
  deal_label?: string | null;
  deal_expires_at?: string | null;
  is_wholesale?: boolean | null;
  can_sell_individually?: boolean | null;
  pack_size?: number | null;
  bulk_units?: string | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  is_seller: boolean;
  is_verified: boolean;
  join_date: string;

  university?: University;
  profile_visibility?: VisibilitySetting;
  seller_visibility?: VisibilitySetting;
  saved_visibility?: VisibilitySetting;

  business_name?: string;
  business_logo?: string;
  bio?: string;
  whatsapp_number?: string;

  profile_picture?: string;
}

export interface Listing {
  id: number;
  seller_uid: string;
  name: string;
  price: number;
  description: string;
  category: Category;
  subcategory?: string | null;
  item_type?: string | null;
  spec_values?: ListingSpecValues | null;
  university: University;
  photos: string[];
  video_url?: string | null;
  whatsapp_number: string;
  status: ListingStatus;
  condition?: ListingCondition;
  created_at: string;
  updated_at?: string;
  quantity?: number;
  sold_quantity?: number;
  views_count?: number;
  whatsapp_clicks?: number;
  is_hidden?: number;
  business_name: string;
  business_logo?: string | null;
  is_verified: boolean;
  listing_mode?: ListingMode;
  original_price?: number | null;
  discount_percent?: number | null;
  deal_label?: string | null;
  deal_expires_at?: string | null;
  is_wholesale?: boolean | null;
  can_sell_individually?: boolean | null;
  pack_size?: number | null;
  bulk_units?: string | null;
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
    status: string;
    created_at: string;
  } | null;
}

export interface RatingSummary {
  averageRating: number;
  ratingCount: number;
  myRating: number | null;
  distribution?: Array<{
    stars: number;
    count: number;
    percentage: number;
  }>;
}

export interface ListingReview {
  id: number;
  listing_id: number;
  seller_uid: string;
  reviewer_uid: string;
  reviewer_name: string;
  reviewer_email: string | null;
  reviewer_avatar_url: string | null;
  reviewer_badge: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  seller_reply: string | null;
  seller_reply_at: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ListingReviewSummary {
  averageRating: number;
  ratingCount: number;
  latestReviewAt: string | null;
  distribution: Array<{
    stars: number;
    count: number;
    percentage: number;
  }>;
}

export interface ListingReviewFeedResponse {
  summary: ListingReviewSummary;
  items: ListingReview[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  viewerReview: ListingReview | null;
  canReview: boolean;
}

export interface Conversation {
  id: number;
  listing_id: number;
  buyer_uid: string;
  seller_uid: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  buyer_unread_count: number;
  seller_unread_count: number;
  created_at: string;
  updated_at: string;
  listing: {
    id: number;
    name: string;
    price: number;
    status: string;
    photos: string[];
    university: string;
  };
  seller: {
    uid: string;
    business_name: string;
    business_logo: string | null;
    is_verified: boolean;
  };
  buyer: {
    uid: string;
    business_name: string;
    business_logo: string | null;
    is_verified: boolean;
  };
  unread_count: number;
  blocked_by_you?: boolean;
  blocked_by_other?: boolean;
  can_reply?: boolean;
}

export interface MessageThreadItem {
  id: number;
  conversation_id: number;
  sender_uid: string;
  body: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export type MessageBlockScope = "messages" | "listing" | "all";

export type MessageReportReason =
  | "spam"
  | "scam"
  | "harassment"
  | "fake_listing"
  | "abusive_language"
  | "off_platform_fraud";

export interface MessageReport {
  id: number;
  conversation_id: number | null;
  message_id: number | null;
  reporter_uid: string;
  reported_uid: string | null;
  reason: MessageReportReason;
  details: string | null;
  status: "open" | "reviewed" | "resolved";
  created_at: string;
  updated_at?: string;
}
