import type { EscrowLedgerEntry, MoneyValue } from '../../../src/modules/payments/types';
import type { EscrowState } from '../../../src/shared/types/payment';

export interface EscrowRecord {
  id: string;
  orderId: string;
  state: EscrowState;
  currency: string;
  balance: MoneyValue;
  entries: EscrowLedgerEntry[];
}

export class EscrowService {
  createEscrow(orderId: string, currency: string, escrowId: string): EscrowRecord {
    return {
      id: escrowId,
      orderId,
      state: 'initiated',
      currency,
      balance: { amount: 0, currency },
      entries: [],
    };
  }

  addEntry(record: EscrowRecord, entry: EscrowLedgerEntry): EscrowRecord {
    return {
      ...record,
      entries: [...record.entries, entry],
      balance: entry.balanceAfter,
    };
  }

  setState(record: EscrowRecord, state: EscrowState): EscrowRecord {
    return {
      ...record,
      state,
    };
  }
}

export const serverEscrowService = new EscrowService();
