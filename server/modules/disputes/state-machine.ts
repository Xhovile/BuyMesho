export type StateActor = 'buyer' | 'seller' | 'admin' | 'system' | 'financial_workflow';

export type CanonicalOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';

export type CanonicalEscrowStatus =
  | 'not_applicable'
  | 'held'
  | 'releasable'
  | 'released'
  | 'refunding'
  | 'refunded';

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

export const ORDER_TRANSITIONS: readonly TransitionDefinition<CanonicalOrderStatus>[] = [
  { from: 'pending', to: 'processing', actors: ['system', 'seller'], movesMoney: false, description: 'Order enters fulfillment processing.' },
  { from: 'pending', to: 'cancelled', actors: ['buyer', 'seller', 'admin', 'system'], movesMoney: false, description: 'Order is cancelled before fulfillment completes.' },
  { from: 'processing', to: 'shipped', actors: ['seller', 'system'], movesMoney: false, description: 'Seller dispatches the order.' },
  { from: 'processing', to: 'cancelled', actors: ['seller', 'admin', 'system'], movesMoney: false, description: 'Order is cancelled during processing.' },
  { from: 'shipped', to: 'delivered', actors: ['seller', 'system', 'buyer'], movesMoney: false, description: 'Delivery is recorded.' },
  { from: 'delivered', to: 'completed', actors: ['buyer', 'system'], movesMoney: false, description: 'Normal transaction lifecycle completes.' },
  { from: 'delivered', to: 'refunded', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Order is marked refunded only after the actual refund path completes.' },
  { from: 'completed', to: 'refunded', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Completed order is marked refunded only after the actual refund path completes.' },
];

export const REFUND_TRANSITIONS: readonly TransitionDefinition<RefundStatus>[] = [
  { from: 'requested', to: 'requested', actors: ['buyer', 'system'], movesMoney: false, description: 'Request recorded.' },
  { from: 'requested', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Refund request enters review.' },
  { from: 'under_review', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Review remains active.' },
  { from: 'under_review', to: 'approved', actors: ['admin'], movesMoney: false, description: 'Refund is approved; no money moves yet.' },
  { from: 'under_review', to: 'rejected', actors: ['admin'], movesMoney: false, description: 'Refund request is denied.' },
  { from: 'under_review', to: 'unavailable', actors: ['admin', 'system'], movesMoney: false, description: 'BuyMesho cannot execute the normal refund path.' },
  { from: 'approved', to: 'processing', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Actual refund execution begins.' },
  { from: 'processing', to: 'refunded', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Refund transaction completed and recorded.' },
];

export const DISPUTE_CASE_TRANSITIONS: readonly TransitionDefinition<DisputeCaseStatus>[] = [
  { from: 'open', to: 'open', actors: ['buyer', 'seller', 'admin', 'system'], movesMoney: false, description: 'Case remains open.' },
  { from: 'open', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Case enters formal review.' },
  { from: 'under_review', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Review remains active.' },
  { from: 'under_review', to: 'resolved', actors: ['admin'], movesMoney: false, description: 'Dispute reaches a final outcome.' },
  { from: 'under_review', to: 'rejected', actors: ['admin'], movesMoney: false, description: 'Submitted claim is denied.' },
];

export const DISPUTE_ATTEMPT_TRANSITIONS: readonly TransitionDefinition<DisputeAttemptStatus>[] = [
  { from: 'open', to: 'open', actors: ['buyer', 'seller', 'admin', 'system'], movesMoney: false, description: 'Attempt remains open.' },
  { from: 'open', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Attempt enters formal review.' },
  { from: 'under_review', to: 'under_review', actors: ['admin', 'system'], movesMoney: false, description: 'Review remains active.' },
  { from: 'under_review', to: 'resolved', actors: ['admin'], movesMoney: false, description: 'Attempt reaches a final decision.' },
  { from: 'under_review', to: 'rejected', actors: ['admin'], movesMoney: false, description: 'Attempt is denied.' },
];

export const ESCROW_TRANSITIONS: readonly TransitionDefinition<CanonicalEscrowStatus>[] = [
  { from: 'not_applicable', to: 'not_applicable', actors: ['system'], movesMoney: false, description: 'Order does not use escrow.' },
  { from: 'held', to: 'releasable', actors: ['admin', 'system'], movesMoney: false, description: 'Funds become eligible for release.' },
  { from: 'releasable', to: 'released', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Escrow is released to the seller.' },
  { from: 'held', to: 'refunding', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Escrow refund execution begins.' },
  { from: 'refunding', to: 'refunded', actors: ['financial_workflow', 'system'], movesMoney: true, description: 'Escrow refund is completed.' },
];

type TransitionTable<T extends string> = ReadonlyMap<string, TransitionDefinition<T>>;

function buildTable<T extends string>(transitions: readonly TransitionDefinition<T>[]): TransitionTable<T> {
  return new Map(transitions.map((transition) => [`${transition.from}->${transition.to}`, transition]));
}

export const ORDER_TRANSITION_TABLE = buildTable(ORDER_TRANSITIONS);
export const REFUND_TRANSITION_TABLE = buildTable(REFUND_TRANSITIONS);
export const DISPUTE_CASE_TRANSITION_TABLE = buildTable(DISPUTE_CASE_TRANSITIONS);
export const DISPUTE_ATTEMPT_TRANSITION_TABLE = buildTable(DISPUTE_ATTEMPT_TRANSITIONS);
export const ESCROW_TRANSITION_TABLE = buildTable(ESCROW_TRANSITIONS);

function assertTransition<T extends string>(table: TransitionTable<T>, from: T, to: T, actor: StateActor): void {
  const transition = table.get(`${from}->${to}`);
  if (!transition) throw new Error(`Illegal state transition: ${from} -> ${to}`);
  if (!transition.actors.includes(actor)) {
    throw new Error(`Actor ${actor} cannot perform state transition: ${from} -> ${to}`);
  }
}

export function assertOrderTransition(from: CanonicalOrderStatus, to: CanonicalOrderStatus, actor: StateActor): void {
  assertTransition(ORDER_TRANSITION_TABLE, from, to, actor);
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

export function assertEscrowTransition(from: CanonicalEscrowStatus, to: CanonicalEscrowStatus, actor: StateActor): void {
  assertTransition(ESCROW_TRANSITION_TABLE, from, to, actor);
}

export function transitionMovesMoney<T extends string>(table: TransitionTable<T>, from: T, to: T): boolean {
  return table.get(`${from}->${to}`)?.movesMoney ?? false;
}
