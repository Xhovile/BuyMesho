import { describe, expect, it } from 'vitest';

import type { PayoutDestinationOwner } from '../payout.destination-ownership.js';

// Compile-time contract checks for the shared owner model. Database behavior
// is covered by the integration migration path used by the application test
// bootstrap.
describe('payout destination ownership contract', () => {
  it('supports seller and event-creator owners', () => {
    const seller: PayoutDestinationOwner = { type: 'seller', uid: 'seller-1' };
    const eventCreator: PayoutDestinationOwner = { type: 'event_creator', uid: 'creator-1' };

    expect(seller.type).toBe('seller');
    expect(eventCreator.type).toBe('event_creator');
  });
});
