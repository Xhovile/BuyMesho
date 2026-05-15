import assert from 'node:assert/strict';
import { test } from 'node:test';
import { escrowRepository } from '../escrow.repository.js';
import { getPaymentDb } from '../../../sqlite.js';

const testOrderIds = [
  'escrow-release-accounting-1',
  'escrow-release-accounting-repeat',
  'escrow-release-accounting-initiated',
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

test('releaseToSellerEarnings validates release state before appending a release ledger entry', () => {
  clearEscrowRepositoryTestState();

  escrowRepository.create('escrow-release-accounting-initiated', 'MWK', 900);
  escrowRepository.updateState('escrow-release-accounting-initiated', 'initiated');

  assert.throws(
    () => escrowRepository.releaseToSellerEarnings({
      orderId: 'escrow-release-accounting-initiated',
      releasedBy: 'buyer-accounting-initiated',
      reference: 'not-funded',
    }),
    /Escrow cannot be released from initiated state/,
  );

  assert.equal(releaseEntries('escrow-release-accounting-initiated').length, 0, 'invalid state should not append a release entry');

  clearEscrowRepositoryTestState();
});
