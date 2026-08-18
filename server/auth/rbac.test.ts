import { describe, expect, it } from "vitest";
import { hasAdminRole, hasRole, normalizeUserRole } from "./rbac.js";

describe("RBAC role model", () => {
  it("normalizes supported roles", () => {
    expect(normalizeUserRole("ADMIN")).toBe("admin");
    expect(normalizeUserRole("finance_admin")).toBe("finance_admin");
    expect(normalizeUserRole("unknown")).toBeNull();
  });

  it("uses explicit role claims for authorization", () => {
    expect(hasAdminRole({ role: "admin" })).toBe(true);
    expect(hasAdminRole({ role: "finance_admin" })).toBe(false);
    expect(hasRole({ role: "moderator" }, "moderator")).toBe(true);
  });

  it("does not treat a finance role as full admin", () => {
    expect(hasAdminRole({ role: "finance_admin", is_admin: false })).toBe(false);
  });
});
