export interface RatingSummary {
  averageRating: number;
  ratingCount: number;
  myRating: number | null;
  distribution?: Array<{ stars: number; count: number; percentage: number }>;
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
  distribution: Array<{ stars: number; count: number; percentage: number }>;
}

export interface ListingReviewFeedResponse {
  summary: ListingReviewSummary;
  items: ListingReview[];
  pagination: { limit: number; offset: number; total: number; hasMore: boolean };
  viewerReview: ListingReview | null;
  canReview: boolean;
}

export interface Conversation {
  id: number;
  listing_id: number | null;
  event_id?: number | null;
  order_id?: string | null;
  thread_type?: "listing" | "event" | "order" | "seller";
  buyer_uid: string;
  seller_uid: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  buyer_unread_count: number;
  seller_unread_count: number;
  created_at: string;
  updated_at: string;
  listing: { id: number; name: string; price: number; status: string; photos: string[]; university: string };
  event?: { id: number; title: string; organizer_name: string; price: number; status: string; location: string; type: string } | null;
  seller: { uid: string; business_name: string; business_logo: string | null; is_verified: boolean };
  buyer: { uid: string; business_name: string; business_logo: string | null; is_verified: boolean };
  unread_count: number;
  blocked_by_you?: boolean;
  blocked_by_other?: boolean;
  can_reply?: boolean;
}

export interface MessageConversation extends Conversation {}

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
export type MessageReportReason = "spam" | "scam" | "harassment" | "fake_listing" | "abusive_language" | "off_platform_fraud";

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
  message_body?: string | null;
  listing_name?: string | null;
  seller_business_name?: string | null;
}