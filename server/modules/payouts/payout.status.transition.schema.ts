import { getPaymentDb } from '../../postgresCompat.js';

const db = getPaymentDb();

/**
 * Database-level payout transition guard.
 *
 * The repository is intentionally large and contains many persistence paths.
 * Enforcing this invariant at the database boundary prevents any caller from
 * bypassing the financial lifecycle policy.
 */
export function ensurePayoutStatusTransitionGuard(): void {
  db.exec(`
    DROP TRIGGER IF EXISTS trg_enforce_payout_status_transition ON payouts;
    DROP FUNCTION IF EXISTS enforce_payout_status_transition();

    CREATE FUNCTION enforce_payout_status_transition()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      -- Repeated non-processing status writes are idempotent and therefore safe.
      IF OLD.status = NEW.status THEN
        IF NEW.status = 'processing' THEN
          RAISE EXCEPTION 'Payout is already processing';
        END IF;
        RETURN NEW;
      END IF;

      IF NOT (
        (OLD.status = 'eligible' AND NEW.status IN ('pending_settlement', 'held', 'cancelled')) OR
        (OLD.status = 'pending_settlement' AND NEW.status IN ('ready_for_payout', 'queued', 'processing', 'held', 'failed', 'cancelled')) OR
        (OLD.status = 'ready_for_payout' AND NEW.status IN ('queued', 'processing', 'held', 'failed', 'cancelled')) OR
        (OLD.status = 'queued' AND NEW.status IN ('processing', 'held', 'failed', 'cancelled')) OR
        (OLD.status = 'processing' AND NEW.status IN ('pending', 'paid', 'failed', 'held', 'cancelled')) OR
        (OLD.status = 'pending' AND NEW.status IN ('processing', 'failed', 'held', 'cancelled')) OR
        (OLD.status = 'held' AND NEW.status IN ('ready_for_payout', 'queued', 'processing', 'cancelled')) OR
        (OLD.status = 'failed' AND NEW.status IN ('pending', 'processing', 'held', 'cancelled'))
      ) THEN
        RAISE EXCEPTION 'Illegal payout status transition: % -> %', OLD.status, NEW.status;
      END IF;

      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER trg_enforce_payout_status_transition
    BEFORE UPDATE OF status ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION enforce_payout_status_transition();
  `);
}

ensurePayoutStatusTransitionGuard();
