import type { CeremonyState, PasskeyCeremonyRepository, PasskeyCredential, PasskeyCredentialRepository } from "@xhovile/platform/passkeys";
import { getPaymentDb } from "../postgresCompat.js";

function toBase64(value: Uint8Array | ArrayBuffer): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function parseTransports(value: unknown): PasskeyCredential["transports"] {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function mapCredential(row: any): PasskeyCredential {
  return {
    id: String(row.credential_id),
    publicKey: fromBase64(String(row.public_key)),
    counter: Number(row.counter ?? 0),
    transports: parseTransports(row.transports_json),
    userId: String(row.user_id),
    createdAt: new Date(String(row.created_at)),
    lastUsedAt: row.last_used_at ? new Date(String(row.last_used_at)) : undefined,
    name: row.name ? String(row.name) : undefined,
    deviceType: row.device_type === "singleDevice" || row.device_type === "multiDevice" ? row.device_type : undefined,
    backedUp: row.backed_up === null || row.backed_up === undefined ? undefined : Boolean(row.backed_up),
  };
}

export class BuyMeshoPasskeyCredentialRepository implements PasskeyCredentialRepository {
  async listByUser(userId: string): Promise<PasskeyCredential[]> {
    const rows = getPaymentDb()
      .prepare(`SELECT * FROM passkey_credentials WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at ASC`)
      .all(userId) as any[];
    return rows.map(mapCredential);
  }

  async findByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
    const row = getPaymentDb()
      .prepare(`SELECT * FROM passkey_credentials WHERE credential_id = ? AND revoked_at IS NULL LIMIT 1`)
      .get(credentialId) as any;
    return row ? mapCredential(row) : null;
  }

  async create(credential: PasskeyCredential): Promise<void> {
    getPaymentDb()
      .prepare(
        `INSERT INTO passkey_credentials
          (credential_id, user_id, public_key, counter, transports_json, name, device_type, backed_up, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .run(
        credential.id,
        credential.userId,
        toBase64(credential.publicKey),
        credential.counter,
        credential.transports ? JSON.stringify(credential.transports) : null,
        credential.name ?? null,
        credential.deviceType ?? null,
        credential.backedUp === undefined ? null : credential.backedUp ? 1 : 0,
      );
  }

  async updateCounter(credentialId: string, counter: number): Promise<void> {
    getPaymentDb()
      .prepare(`UPDATE passkey_credentials SET counter = ? WHERE credential_id = ? AND revoked_at IS NULL`)
      .run(counter, credentialId);
  }

  async touch(credentialId: string, at: Date): Promise<void> {
    getPaymentDb()
      .prepare(`UPDATE passkey_credentials SET last_used_at = ? WHERE credential_id = ? AND revoked_at IS NULL`)
      .run(at.toISOString(), credentialId);
  }

  async revoke(credentialId: string): Promise<void> {
    getPaymentDb()
      .prepare(`UPDATE passkey_credentials SET revoked_at = CURRENT_TIMESTAMP WHERE credential_id = ? AND revoked_at IS NULL`)
      .run(credentialId);
  }
}

export class BuyMeshoPasskeyCeremonyRepository implements PasskeyCeremonyRepository {
  async save(state: CeremonyState): Promise<void> {
    getPaymentDb()
      .prepare(
        `INSERT INTO passkey_ceremonies (id, kind, user_id, challenge, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(state.id, state.kind, state.userId ?? null, state.challenge, state.expiresAt.toISOString());
  }

  async consume(ceremonyId: string): Promise<CeremonyState | null> {
    const db = getPaymentDb();
    const row = db
      .prepare(`SELECT id, kind, user_id, challenge, expires_at FROM passkey_ceremonies WHERE id = ? LIMIT 1`)
      .get(ceremonyId) as any;

    if (!row) return null;
    db.prepare(`DELETE FROM passkey_ceremonies WHERE id = ?`).run(ceremonyId);
    return {
      id: String(row.id),
      kind: String(row.kind) as CeremonyState["kind"],
      userId: row.user_id ? String(row.user_id) : undefined,
      challenge: String(row.challenge),
      expiresAt: new Date(String(row.expires_at)),
    };
  }
}
