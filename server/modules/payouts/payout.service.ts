import type { MoneyValue } from '../../../src/shared/types/common';

export interface PayoutRequest {
  sellerId: string;
  amount: MoneyValue;
}

export class PayoutService {
  processPayout(request: PayoutRequest) {
    return {
      status: 'processing',
      ...request,
    };
  }
}

export const payoutService = new PayoutService();
