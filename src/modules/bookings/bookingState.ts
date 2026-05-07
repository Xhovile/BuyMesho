import type { EntityId, ISODateString, Timestamped } from '../../shared/types/common';
import type { MoneyValue } from '../../shared/types/common';

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'refunded';

export interface BookingSlot {
  startAt: ISODateString;
  endAt: ISODateString;
}

export interface BookingState extends Timestamped {
  id: EntityId;
  orderId: EntityId;
  listingId: EntityId;
  buyerId: EntityId;
  sellerId: EntityId;
  status: BookingStatus;
  slot: BookingSlot;
  currency: string;
  total: MoneyValue;
  escrowId?: EntityId | null;
  paidAt?: ISODateString | null;
}
