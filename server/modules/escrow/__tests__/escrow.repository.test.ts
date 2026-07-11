import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escrowRepository } from '../escrow.repository.js';
import { getPaymentDb } from '../../../postgresCompat.js';

const testOrderIds = [
  'escrow-release-accounting-1',
  'escrow-release-accounting-repeat',
  'escrow-release-accounting-held',
  'escrow-release-accounting-disputed',
  'escrow-refund-accounting-1',
  'escrow-refund-accounting-repeat',
  'escrow-refund-accounting-released',
];

function clearEscrowRepositoryTestState(): void {
  const db = getPaymentDb();
  for (const orderId of testOrderIds) {
    db.prepare('DELETE FROM escrows WHERE order_id = ?').run(orderId);
  }
}

function releaseEntries(orderId: string) {
  return escrowRepository
    .findByOrderId(orderId)
    ?.entries.filter((entry) => entry.entryType === 'release') ?? [];
}

function refundEntries(orderId: string) {
  return escrowRepository
    .findByOrderId(orderId)
    ?.entries.filter((entry) => entry.entryType === 'refund') ?? [];
}

test('releaseToSellerEarnings creates an audited release ledger entry and persists zero balance', () => {
  clearEscrowRepositoryTestState();

  escrowRepository.create('escrow-release-accounting-1', 'MWK', 2500);

  const result = escrowRepository.releaseToSellerEarnings({
    orderId: 'escrow-release-accounting-1',
    releasedBy: 'buyer-accounting-1',
    reference: 'buyer-confirmed-delivery',
  });

  assert.ok(result, 'release should return the updated escrow');
  assert.equal(result.escrow.state, 'released', 'escrow should be marked released');
  assert.equal(result.escrow.balanceAmount, 0, 'released escrow should have zero balance');
  assert.equal(result.releaseEntry.entryType, 'release', 'release should create a release ledger entry');
  assert.equal(result.releaseEntry.amount, 2500, 'release entry should record released amount');
  assert.equal(result.releaseEntry.currency, 'MWK', 'release entry should record currency');
  assert.equal(result.releaseEntry.balanceAfter, 0, 'release entry should zero the balance');
  assert.equal(result.releaseEntry.actorId, 'buyer-accounting-1', 'release entry should audit the releasing actor');
  assert.equal(result.releaseEntry.reference, 'buyer-confirmed-delivery', 'release entry should audit the release reference');

  const persisted = escrowRepository.findByOrderId('escrow-release-accounting-1');
  const persistedRelease = persisted?.entries.find((entry) => entry.entryType === 'release');

  assert.equal(persisted?.state, 'released', 'released state should be persisted');
  assert.equal(persisted?.balanceAmount, 0, 'zero balance should be persisted');
  assert.equal(persistedRelease?.id, result.releaseEntry.id, 'release entry should be persisted');
  assert.equal(persistedRelease?.actorId, 'buyer-accounting-1', 'persisted release should retain actor audit field');
  assert.equal(persistedRelease?.reference, 'buyer-confirmed-delivery', 'persisted release should retain reference audit field');

  clearEscrowRepositoryTestState();
});

test('releaseToSellerEarnings rejects repeat release attempts without duplicating release ledger entries', () => {
  clearEscrowRepositoryTestState();

  escrowRepository.create('escrow-release-accounting-repeat', 'MWK', 1800);
  escrowRepository.releaseToSellerEarnings({
    orderId: 'escrow-release-accounting-repeat',
    releasedBy: 'buyer-accounting-repeat',
    reference: 'first-release',
  });

  assert.throws(
    () => escrowRepository.releaseToSellerEarnings({
      orderId: 'escrow-release-accounting-repeat',
      releasedBy: 'buyer-accounting-repeat',
      reference: 'second-release',
    }),
    /Escrow is already released/,
  );

  const releases = releaseEntries('escrow-release-accounting-repeat');
  assert.equal(releases.length, 1, 'repeat release should not append another release entry');
  assert.equal(releases[0]?.reference, 'first-release', 'repeat release should preserve the original release audit reference');

  clearEscrowRepositoryTestState();
});

test('releaseToSellerEarnings validates escrow state transitions before appending a release ledger entry', () => {
  clearEscrowRepositoryTestState();

  escrowRepository.create('escrow-release-accounting-held', 'MWK', 900);
  escrowRepository.updateState('escrow-release-accounting-held', 'held');

  const result = escrowRepository.releaseToSellerEarnings({
    orderId: 'escrow-release-accounting-held',
    releasedBy: 'buyer-accounting-held',
    reference: 'held-release',
  });

  assert.equal(result.escrow.state, 'released', 'held escrows should transition into released state');
  assert.equal(result.releaseEntry.reference, 'held-release', 'held release should preserve release reference');
  assert.equal(releaseEntries('escrow-release-accounting-held').length, 1, 'held release should append one release entry');

  clearEscrowRepositoryTestState();
});

test('releaseToSellerEarnings rejects disputed escrows without appending release entries', () => {
  clearEscrowRepositoryTestState();

  escrowRepository.create('escrow-release-accounting-disputed', 'MWK', 1200);
  escrowRepository.updateState('escrow-release-accounting-disputed', 'disputed');

  assert.throws(
    () => escrowRepository.releaseToSellerEarnings({
      orderId: 'escrow-release-accounting-disputed',
      releasedBy: 'buyer-accounting-disputed',
      reference: 'disputed-release',
    }),
    /Escrow cannot be released from disputed state/,
  );

  assert.equal(
    releaseEntries('escrow-release-accounting-disputed').length,
    0,
    'disputed escrows should not append release entries',
  );

  clearEscrowRepositoryTestState();
});


test('refundHeldBalance creates an audited refund ledger entry and persists zero balance', () => {
  clearEscrowRepositoryTestState();

  escrowRepository.create('escrow-refund-accounting-1', 'MWK', 2100);

  const result = escrowRepository.refundHeldBalance({
    orderId: 'escrow-refund-accounting-1',
    refundedBy: 'admin-refund-accounting-1',
    reference: 'admin-confirmed-refund',
    note: 'Buyer refund approved',
  });

  assert.ok(result, 'refund should return the updated escrow');
  assert.equal(result.escrow.state, 'refunded', 'escrow should be marked refunded');
  assert.equal(result.escrow.balanceAmount, 0, 'refunded escrow should have zero balance');
  assert.equal(result.refundEntry.entryType, 'refund', 'refund should create a refund ledger entry');
  assert.equal(result.refundEntry.amount, 2100, 'refund entry should record refunded amount');
  assert.equal(result.refundEntry.currency, 'MWK', 'refund entry should record currency');
  assert.equal(result.refundEntry.balanceAfter, 0, 'refund entry should zero the balance');
  assert.equal(result.refundEntry.actorId, 'admin-refund-accounting-1', 'refund entry should audit the refunding actor');
  assert.equal(result.refundEntry.reference, 'admin-confirmed-refund', 'refund entry should audit the refund reference');
  assert.equal(result.refundEntry.note, 'Buyer refund approved', 'refund entry should keep the admin reason');

  const persisted = escrowRepository.findByOrderId('escrow-refund-accounting-1');
  const persistedRefund = persisted?.entries.find((entry) => entry.entryType === 'refund');

  assert.equal(persisted?.state, 'refunded', 'refunded state should be persisted');
  assert.equal(persisted?.balanceAmount, 0, 'zero balance should be persisted');
  assert.equal(persistedRefund?.id, result.refundEntry.id, 'refund entry should be persisted');
  assert.equal(persistedRefund?.actorId, 'admin-refund-accounting-1', 'persisted refund should retain actor audit field');
  assert.equal(persistedRefund?.reference, 'admin-confirmed-refund', 'persisted refund should retain reference audit field');

  clearEscrowRepositoryTestState();
});

test('refundHeldBalance rejects repeat refunds without duplicating refund ledger entries', () => {
  clearEscrowRepositoryTestState();

  escrowRepository.create('escrow-refund-accounting-repeat', 'MWK', 1700);
  escrowRepository.refundHeldBalance({
    orderId: 'escrow-refund-accounting-repeat',
    refundedBy: 'admin-refund-accounting-repeat',
    reference: 'first-refund',
    note: 'First refund',
  });

  assert.throws(
    () => escrowRepository.refundHeldBalance({
      orderId: 'escrow-refund-accounting-repeat',
      refundedBy: 'admin-refund-accounting-repeat',
      reference: 'second-refund',
      note: 'Second refund',
    }),
    /Escrow is already refunded/,
  );

  const refunds = refundEntries('escrow-refund-accounting-repeat');
  assert.equal(refunds.length, 1, 'repeat refund should not append another refund entry');
  assert.equal(refunds[0]?.reference, 'first-refund', 'repeat refund should preserve original refund audit reference');

  clearEscrowRepositoryTestState();
});

test('refundHeldBalance rejects released escrows without appending refund entries', () => {
  clearEscrowRepositoryTestState();

  escrowRepository.create('escrow-refund-accounting-released', 'MWK', 1900);
  escrowRepository.releaseToSellerEarnings({
    orderId: 'escrow-refund-accounting-released',
    releasedBy: 'buyer-refund-accounting-released',
    reference: 'already-released',
  });

  assert.throws(
    () => escrowRepository.refundHeldBalance({
      orderId: 'escrow-refund-accounting-released',
      refundedBy: 'admin-refund-accounting-released',
      reference: 'refund-after-release',
      note: 'Should not refund released escrow',
    }),
    /Escrow is already released/,
  );

  assert.equal(
    refundEntries('escrow-refund-accounting-released').length,
    0,
    'released escrows should not append refund entries',
  );

  clearEscrowRepositoryTestState();
});
