import type { EscrowState } from '../../../src/shared/types/payment.js';

export interface ServerReleaseContext {
  state: EscrowState;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  dispute: boolean;
  daysHeld: number;
}

export function canRelease(ctx: ServerReleaseContext): boolean {
  if (ctx.dispute) return false;
  if (ctx.state === 'released' || ctx.state === 'refunded') return false;
  if (ctx.buyerConfirmed || ctx.sellerConfirmed) return true;
  if (ctx.daysHeld >= 7) return true;
  return false;
}
