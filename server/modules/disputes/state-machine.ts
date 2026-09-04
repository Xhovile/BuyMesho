export type StateActor = 'buyer' | 'seller' | 'admin' | 'system' | 'financial_workflow';

export type RefundStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'processing'
  | 'refunded'
  | 'rejected'
  | 'unavailable';

export type DisputeCaseStatus = 'open' | 'under_review' | 'resolved' | 'rejected';
export type DisputeAttemptStatus = 'open' | 'under_review' | 'resolved' | 'rejected';

export type TransitionDefinition<T extends string> = {
  from: T;
  to: T;
  actors: readonly StateActor[];
  movesMoney: boolean;
  description: string;
};

const REFUND_TRANSITIONS: readonly TransitionDefinition<RefundStatus>[] = [
  { from: 'requested', to: 'requested', actors: ['buyer', 'system'], movesMoney: false, description: 'Request recorded.' },
  { from: 'requested', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Refund request enters review.' },
  { from: 'under_review', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Review remains active.' },
  { from: 'under_review', to: 'approved', actors: ['admin'], movesMoney: false, description: 'Refund is approved; no money moves yet.' },
  { from: 'under_review', to: 'rejected', actors: ['admin'], movesMoney: false, description: 'Refund request is denied.' },
  { from: 'under_review', to: 'unavailable', actors: ['admin', 'system'], movesMoney: false, description: 'BuyMesho cannot execute the normal refund path.' },
  { from: 'approved', to: 'processing', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Actual refund execution begins.' },
  { from: 'processing', to: 'refunded', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Refund transaction completed and recorded.' },
];

const DISPUTE_CASE_TRANSITIONS: readonly TransitionDefinition<DisputeCaseStatus>[] = [
  { from: 'open', to: 'open', actors: ['buyer', 'seller', 'admin', 'system'], movesMoney: false, description: 'Case remains open.' },
  { from: 'open', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Case enters formal review.' },
  { from: 'under_review', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Review remains active.' },
  { from: 'under_review', to: 'resolved', actors: ['admin'], movesMoney: false, description: 'Dispute reaches a final outcome.' },
  { from: 'under_review', to: 'rejected', actors: ['admin'], movesMoney: false, description: 'Submitted claim is denied.' },
];

const DISPUTE_ATTEMPT_TRANSITIONS: readonly TransitionDefinition<DisputeAttemptStatus>[] = [
  { from: 'open', to: 'open', actors: ['buyer', 'seller', 'admin', 'system'], movesMoney: false, description: 'Attempt remains open.' },
  { from: 'open', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Attempt enters formal review.' },
  { from: 'under_review', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Review remains active.' },
  { from: 'under_review', to: 'resolved', actors: ['admin'], movesMoney: false, description: 'Attempt reaches a final decision.' },
  { from: 'under_review', to: 'rejected', actors: ['admin'], movesMoney: false, description: 'Attempt is denied.' },
];

export const ESCROW_STATE_TRANSITIONS: readonly TransitionDefinition<'funded' | 'held' | 'released' | 'refunded' | 'disputed' | 'closed'>[] = [
  { from: 'funded', to: 'held', actors: ['system', 'financial_workflow'], movesMoney: false, description: 'Funds become held for transaction protection.' },
  { from: 'held', to: 'disputed', actors: ['system', 'admin'], movesMoney: false, description: 'Funds are protected while a dispute is reviewed.' },
  { from: 'held', to: 'released', actors: ['admin', 'financial_workflow', 'system'], movesMoney: true, description: 'Escrow is released to the seller.' },
  { from: 'held', to: 'refunded', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Escrow funds are refunded to the buyer.' },
  { from: 'disputed', to: 'held', actors: ['admin', 'system'], movesMoney: false, description: 'Rejected dispute restores the prior held state.' },
  { from: 'disputed', to: 'released', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Seller wins and funds are released.' },
  { from: 'disputed', to: 'refunded', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Buyer wins and funds are refunded.' },
  { from: 'released', to: 'closed', actors: ['system'], movesMoney: false, description: 'Released escrow is closed.' },
  { from: 'refunded', to: 'closed', actors: ['system'], movesMoney: false, description: 'Refunded escrow is closed.' },
];

type TransitionTable<T extends string> = ReadonlyMap<string, TransitionDefinition<T>>;

function buildTable<T extends string>(transitions: readonly TransitionDefinition<T>[]): TransitionTable<T> {
  return new Map(transitions.map((transition) => [`${transition.from}->${transition.to}`, transition]));
}

export const REFUND_TRANSITION_TABLE = buildTable(REFUND_TRANSITIONS);
export const DISPUTE_CASE_TRANSITION_TABLE = buildTable(DISPUTE_CASE_TRANSITIONS);
export const DISPUTE_ATTEMPT_TRANSITION_TABLE = buildTable(DISPUTE_ATTEMPT_TRANSITIONS);
export const ESCROW_TRANSITION_TABLE = buildTable(ESCROW_STATE_TRANSITIONS);

function assertTransition<T extends string>(
  table: TransitionTable<T>,
  from: T,
  to: T,
  actor: StateActor,
): TransitionDefinition<T> {
  const transition = table.get(`${from}->${to}`);
  if (!transition) throw new Error(`Illegal state transition: ${from} -> ${to}`);
  if (!transition.actors.includes(actor)) {
    throw new Error(`Actor ${actor} cannot perform state transition: ${from} -> ${to}`);
  }
  return transition;
}

export function assertRefundTransition(from: RefundStatus, to: RefundStatus, actor: StateActor): void {
  assertTransition(REFUND_TRANSITION_TABLE, from, to, actor);
}

export function assertDisputeCaseTransition(from: DisputeCaseStatus, to: DisputeCaseStatus, actor: StateActor): void {
  assertTransition(DISPUTE_CASE_TRANSITION_TABLE, from, to, actor);
}

export function assertDisputeAttemptTransition(from: DisputeAttemptStatus, to: DisputeAttemptStatus, actor: StateActor): void {
  assertTransition(DISPUTE_ATTEMPT_TRANSITION_TABLE, from, to, actor);
}

export function assertEscrowTransition(
  from: 'funded' | 'held' | 'released' | 'refunded' | 'disputed' | 'closed',
  to: 'funded' | 'held' | 'released' | 'refunded' | 'disputed' | 'closed',
  actor: StateActor,
): void {
  assertTransition(ESCROW_TRANSITION_TABLE, from, to, actor);
}

export function transitionMovesMoney<T extends string>(
  table: TransitionTable<T>,
  from: T,
  to: T,
): boolean {
  return table.get(`${from}->${to}`)?.movesMoney ?? false;
}
