import type { EntityId, ISODateString, MoneyValue, Timestamped } from '../../shared/types/common.js';
import type { CheckoutSettlementRoute, PaymentProviderKey } from '../../shared/types/payment.js';

export type OrderStatus = 'draft' | 'pending_payment' | 'paid' | 'in_escrow' | 'fulfilled' | 'cancelled' | 'refunded' | 'disputed' | 'closed';
export type OrderSource = 'listing' | 'layby' | 'event' | 'mixed' | 'accommodation' | 'wholesale';

export interface BuyerDeliveryDetails {
  fullName: string;
  phone: string;
  addressLine: string;
  area: string;
  townOrDistrict: string;
  landmark: string;
}

export interface OrderItem {
  kind?: 'listing' | 'event_ticket';
  listingId?: EntityId;
  eventId?: EntityId;
  title: string;
  quantity: number;
  unitPrice: MoneyValue;
  reference?: string;
  organizerName?: string;
  eventDate?: string;
  startTime?: string;
  venue?: string;
  location?: string;
  ticketLink?: string | null;
}

export interface OrderState extends Timestamped {
  id: EntityId;
  buyerId: EntityId;
  sellerId: EntityId;
  source: OrderSource;
  status: OrderStatus;
  currency: string;
  subtotal: MoneyValue;
  fees?: MoneyValue;
  total: MoneyValue;
  paymentProvider?: PaymentProviderKey | null;
  settlementRoute?: CheckoutSettlementRoute | null;
  paymentReference?: string | null;
  escrowId?: EntityId | null;
  items: OrderItem[];
  buyerDetails?: BuyerDeliveryDetails | null;
  placedAt?: ISODateString | null;
  paidAt?: ISODateString | null;
  fulfilledAt?: ISODateString | null;
}

export interface OrderStateTransition {
  from: OrderStatus;
  to: OrderStatus;
  reason: string;
}

export const ORDER_STATE_FLOW: readonly OrderStatus[] = [
  'draft',
  'pending_payment',
  'paid',
  'in_escrow',
  'fulfilled',
  'cancelled',
  'refunded',
  'disputed',
  'closed',
] as const;

export const ORDER_ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  draft: ['pending_payment', 'cancelled'],
  pending_payment: ['paid', 'cancelled'],
  paid: ['in_escrow', 'fulfilled', 'cancelled', 'refunded', 'disputed'],
  in_escrow: ['fulfilled', 'refunded', 'disputed'],
  fulfilled: ['refunded', 'disputed', 'closed'],
  cancelled: [],
  refunded: [],
  disputed: ['refunded', 'fulfilled', 'closed'],
  closed: [],
} as const;

export function isAllowedOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return ORDER_ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertAllowedOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (isAllowedOrderTransition(from, to)) return;
  throw new Error(`Illegal order state transition: ${from} -> ${to}`);
}
