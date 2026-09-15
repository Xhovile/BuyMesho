import { describe, expect, it } from 'vitest';

import {
  type PayoutDestinationOwner,
  assertPayoutDestinationOwner,
} from '../payout.destination-ownership.js';

describe('event payout destination binding contract', () => {
  it('uses the event creator as the destination owner', () => {
    const owner: PayoutDestinationOwner = {
      type: 'event_creator',
      uid: 'creator-123',
    };

    expect(() => assertPayoutDestinationOwner(owner)).not.toThrow();
    expect(owner.type).toBe('event_creator');
    expect(owner.uid).toBe('creator-123');
  });

  it('rejects an empty destination owner id', () => {
    expect(() => assertPayoutDestinationOwner({
      type: 'event_creator',
      uid: '   ',
    })).toThrow('Payout destination owner id is required');
  });
});
