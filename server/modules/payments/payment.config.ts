import dotenv from "dotenv";

dotenv.config();

export function readPaymentEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function defaultPayChanguCallbackUrl(): string | undefined {
  const explicit = readPaymentEnv("PAYCHANGU_CALLBACK_URL");
  if (explicit) return explicit;

  const backendUrl = readPaymentEnv("BACKEND_URL");
  if (backendUrl) return `${backendUrl.replace(/\/$/, "")}/api/payments/paychangu/callback`;

  return undefined;
}

export function defaultPayChanguReturnUrl(): string | undefined {
  const explicit = readPaymentEnv("PAYCHANGU_RETURN_URL");
  if (explicit) return explicit;

  const backendUrl = readPaymentEnv("BACKEND_URL");
  if (backendUrl) return `${backendUrl.replace(/\/$/, "")}/api/payments/paychangu/return`;

  return undefined;
}
