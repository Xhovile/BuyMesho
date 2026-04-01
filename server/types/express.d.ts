declare global {
 namespace Express {
 interface Request {
 user?: {
  uid: string;
  email: string | null;
  email_verified?: boolean;
  is_admin?: boolean;
 };
 }
 }
}
export {};
