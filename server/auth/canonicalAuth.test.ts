import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { resolveCanonicalIdentity } from "./canonicalAuth.js";

describe("canonical auth boundary", () => {
  it("does not resolve an identity without a bearer credential", async () => {
    const req = { headers: {} } as Request;
    await expect(resolveCanonicalIdentity(req)).resolves.toBeNull();
  });
});
