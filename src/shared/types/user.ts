import type { EntityId, ISODateString, Nullable, Timestamped } from './common.js';

export type UserRole = 'buyer' | 'seller' | 'admin' | 'support';
export type AccountStatus = 'active' | 'pending' | 'suspended' | 'deleted';

export interface UserProfile extends Timestamped {
  id: EntityId;
  uid: string;
  displayName: string;
  email: string;
  phoneNumber?: Nullable<string>;
  role: UserRole;
  status: AccountStatus;
  avatarUrl?: Nullable<string>;
  campusId?: Nullable<string>;
  bio?: Nullable<string>;
  verifiedEmail: boolean;
  verifiedPhone: boolean;
  lastLoginAt?: Nullable<ISODateString>;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: ISODateString;
  user: UserProfile;
}

export interface SellerProfile extends Timestamped {
  id: EntityId;
  userId: EntityId;
  businessName: string;
  campusId?: Nullable<string>;
  description?: Nullable<string>;
  whatsappNumber?: Nullable<string>;
  logoUrl?: Nullable<string>;
  isVerified: boolean;
}
