export const ADMIN_ACTION_TYPES = {
  APPROVE_SELLER_APPLICATION: "approve_seller_application",
  REJECT_SELLER_APPLICATION: "reject_seller_application",
  HIDE_LISTING: "hide_listing",
  UNHIDE_LISTING: "unhide_listing",
  SUSPEND_SELLER: "suspend_seller",
  UNSUSPEND_SELLER: "unsuspend_seller",
  SUSPEND_PAYOUTS: "suspend_payouts",
  UNSUSPEND_PAYOUTS: "unsuspend_payouts",
} as const;

export const ADMIN_TARGET_TYPES = {
  SELLER_APPLICATION: "seller_application",
  LISTING: "listing",
  SELLER: "seller",
} as const;

export type AdminActionType = (typeof ADMIN_ACTION_TYPES)[keyof typeof ADMIN_ACTION_TYPES];
export type AdminTargetType = (typeof ADMIN_TARGET_TYPES)[keyof typeof ADMIN_TARGET_TYPES];

export const ADMIN_ACTION_LABELS: Record<AdminActionType, string> = {
  [ADMIN_ACTION_TYPES.APPROVE_SELLER_APPLICATION]: "Approved seller application",
  [ADMIN_ACTION_TYPES.REJECT_SELLER_APPLICATION]: "Rejected seller application",
  [ADMIN_ACTION_TYPES.HIDE_LISTING]: "Hid listing",
  [ADMIN_ACTION_TYPES.UNHIDE_LISTING]: "Unhid listing",
  [ADMIN_ACTION_TYPES.SUSPEND_SELLER]: "Suspended seller",
  [ADMIN_ACTION_TYPES.UNSUSPEND_SELLER]: "Unsuspended seller",
  [ADMIN_ACTION_TYPES.SUSPEND_PAYOUTS]: "Suspended payouts",
  [ADMIN_ACTION_TYPES.UNSUSPEND_PAYOUTS]: "Unsuspended payouts",
};

export const ADMIN_TARGET_LABELS: Record<AdminTargetType, string> = {
  [ADMIN_TARGET_TYPES.SELLER_APPLICATION]: "Seller application",
  [ADMIN_TARGET_TYPES.LISTING]: "Listing",
  [ADMIN_TARGET_TYPES.SELLER]: "Seller",
};

export function isAdminActionType(value: string): value is AdminActionType {
  return Object.values(ADMIN_ACTION_TYPES).includes(value as AdminActionType);
}

export function isAdminTargetType(value: string): value is AdminTargetType {
  return Object.values(ADMIN_TARGET_TYPES).includes(value as AdminTargetType);
}
