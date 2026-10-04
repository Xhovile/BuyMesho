import { createReadStream } from "node:fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

export type CloudinaryResourceType = "image" | "video" | "raw";

export type CloudinaryFailureKind =
  | "quota_exhausted"
  | "rate_limited"
  | "upload_size_limit"
  | "authentication"
  | "invalid_request"
  | "not_found"
  | "forbidden"
  | "transient"
  | "unknown";

export type CloudinaryAccount = {
  id: string;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export type CloudinaryUploadAsset = {
  secureUrl: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  bytes: number;
  cloudName: string;
  accountId: string;
};

export type CloudinaryMediaUploadAsset = Omit<CloudinaryUploadAsset, "resourceType"> & {
  resourceType: "image" | "video";
};

export class CloudinaryUploadError extends Error {
  readonly kind: CloudinaryFailureKind;
  readonly accountId: string;
  readonly cloudName: string;
  readonly httpCode: number | null;
  readonly causeError: unknown;

  constructor(
    message: string,
    details: {
      kind: CloudinaryFailureKind;
      account: CloudinaryAccount;
      httpCode?: number | null;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "CloudinaryUploadError";
    this.kind = details.kind;
    this.accountId = details.account.id;
    this.cloudName = details.account.cloudName;
    this.httpCode = details.httpCode ?? null;
    this.causeError = details.cause;
  }
}

function readErrorHttpCode(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const record = error as Record<string, unknown>;
  const candidates = [record.http_code, record.httpCode, record.statusCode, record.status];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const nested = record.error;
    if (nested && typeof nested === "object") {
      const message = (nested as Record<string, unknown>).message;
      if (typeof message === "string") return message;
    }
    if (typeof record.message === "string") return record.message;
  }
  return "Cloudinary operation failed";
}

export function classifyCloudinaryError(error: unknown): CloudinaryFailureKind {
  const httpCode = readErrorHttpCode(error);
  const message = readErrorMessage(error).toLowerCase();

  if (
    httpCode === 413 ||
    /file size|upload size|entity too large|request entity too large|maximum.*(size|file)|too large/.test(message)
  ) {
    return "upload_size_limit";
  }

  if (
    httpCode === 420 ||
    httpCode === 429 ||
    /rate.?limit|too many requests/.test(message)
  ) {
    return "rate_limited";
  }

  if (
    /quota|credit|credits|storage.*limit|bandwidth.*limit|transformation.*limit|usage.*limit|plan.*limit|capacity/.test(message)
  ) {
    return "quota_exhausted";
  }

  if (httpCode === 401 || /unauthorized|authorization required|invalid.*(api|credential)|api key|api_secret|authentication/.test(message)) {
    return "authentication";
  }

  if (httpCode === 403 || /not allowed|forbidden|permission denied/.test(message)) {
    return "forbidden";
  }

  if (httpCode === 404 || /not found/.test(message)) {
    return "not_found";
  }

  if (httpCode === 400 || /invalid request|missing required|bad request|unsupported/.test(message)) {
    return "invalid_request";
  }

  if (
    httpCode === 408 ||
    httpCode === 500 ||
    httpCode === 502 ||
    httpCode === 503 ||
    httpCode === 504 ||
    /timeout|timed out|temporar|connection reset|network|socket|econn|enotfound/.test(message)
  ) {
    return "transient";
  }

  return "unknown";
}

function parseAccountPart(index: number): CloudinaryAccount | null {
  const cloudName = process.env[`CLOUDINARY_${index}_CLOUD_NAME`]?.trim() ?? "";
  const apiKey = process.env[`CLOUDINARY_${index}_API_KEY`]?.trim() ?? "";
  const apiSecret = process.env[`CLOUDINARY_${index}_API_SECRET`]?.trim() ?? "";

  const anyConfigured = Boolean(cloudName || apiKey || apiSecret);
  if (!anyConfigured) return null;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn(`[cloudinary] CLOUDINARY_${index}_* is partially configured; it will not be used.`);
    return null;
  }

  return {
    id: `cloudinary_${index}`,
    cloudName,
    apiKey,
    apiSecret,
  };
}

export function getCloudinaryAccounts(): CloudinaryAccount[] {
  const accounts: CloudinaryAccount[] = [];

  // Preserve the original BuyMesho Cloudinary configuration as the first account.
  const legacyCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() ?? "";
  const legacyApiKey = process.env.CLOUDINARY_API_KEY?.trim() ?? "";
  const legacyApiSecret = process.env.CLOUDINARY_API_SECRET?.trim() ?? "";
  const legacyAnyConfigured = Boolean(
    legacyCloudName || legacyApiKey || legacyApiSecret,
  );

  if (legacyAnyConfigured) {
    if (legacyCloudName && legacyApiKey && legacyApiSecret) {
      accounts.push({
        id: "cloudinary_1",
        cloudName: legacyCloudName,
        apiKey: legacyApiKey,
        apiSecret: legacyApiSecret,
      });
    } else {
      console.warn("[cloudinary] Legacy CLOUDINARY_* variables are partially configured; the original account will not be used.");
    }
  }

  // Additional accounts are explicitly numbered 2 and 3, so the original
  // Cloudinary environment remains Account 1 without requiring a migration.
  for (const index of [2, 3]) {
    const account = parseAccountPart(index);
    if (account) accounts.push({
      ...account,
      id: `cloudinary_${index}`,
    });
  }

  // Backward compatibility: if the legacy variables are absent, allow a
  // fully configured CLOUDINARY_1_* set to act as Account 1.
  if (!accounts.length) {
    const accountOne = parseAccountPart(1);
    if (accountOne) accounts.push({
      ...accountOne,
      id: "cloudinary_1",
    });
  }

  return accounts;
}

export function getCloudinaryConfigurationStatus() {
  const accounts = getCloudinaryAccounts();
  const configuredNumberedIndexes = [2, 3].filter((index) =>
    Boolean(
      process.env[`CLOUDINARY_${index}_CLOUD_NAME`]?.trim() ||
      process.env[`CLOUDINARY_${index}_API_KEY`]?.trim() ||
      process.env[`CLOUDINARY_${index}_API_SECRET`]?.trim(),
    ),
  );

  const legacyConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_API_KEY?.trim() &&
    process.env.CLOUDINARY_API_SECRET?.trim(),
  );

  const numberedAccountOneConfigured = Boolean(
    process.env.CLOUDINARY_1_CLOUD_NAME?.trim() &&
    process.env.CLOUDINARY_1_API_KEY?.trim() &&
    process.env.CLOUDINARY_1_API_SECRET?.trim(),
  );

  return {
    configured: accounts.length > 0,
    accountCount: accounts.length,
    accountIds: accounts.map((account) => account.id),
    configuredNumberedIndexes,
    legacyConfigured,
    numberedAccountOneConfigured,
  };
}

const unavailableUntil = new Map<string, number>();

function isAccountTemporarilyUnavailable(account: CloudinaryAccount): boolean {
  const until = unavailableUntil.get(account.id) ?? 0;
  if (until <= Date.now()) {
    unavailableUntil.delete(account.id);
    return false;
  }
  return true;
}

function markAccountUnavailable(account: CloudinaryAccount, kind: CloudinaryFailureKind) {
  const cooldownMs =
    kind === "quota_exhausted"
      ? 30 * 60 * 1000
      : kind === "rate_limited"
        ? 60 * 1000
        : 15 * 1000;

  unavailableUntil.set(account.id, Date.now() + cooldownMs);
}

function clearAccountUnavailable(account: CloudinaryAccount) {
  unavailableUntil.delete(account.id);
}

function configureCloudinaryAccount(account: CloudinaryAccount) {
  cloudinary.config({
    cloud_name: account.cloudName,
    api_key: account.apiKey,
    api_secret: account.apiSecret,
    secure: true,
  });
}

function getAccountForCloudName(cloudName: string | null | undefined): CloudinaryAccount | null {
  const normalized = String(cloudName ?? "").trim();
  if (!normalized) return null;
  return getCloudinaryAccounts().find((account) => account.cloudName === normalized) ?? null;
}

function getCloudNameFromSecureUrl(secureUrl: string | null | undefined): string | null {
  if (!secureUrl) return null;
  try {
    const url = new URL(secureUrl);
    if (url.hostname !== "res.cloudinary.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] ?? null;
  } catch {
    return null;
  }
}

function shouldTryAnotherAccount(kind: CloudinaryFailureKind): boolean {
  return kind === "quota_exhausted" || kind === "rate_limited" || kind === "transient";
}

async function uploadAcrossCloudinaryAccounts<T>(
  operation: (account: CloudinaryAccount) => Promise<T>,
): Promise<{ value: T; account: CloudinaryAccount }> {
  const accounts = getCloudinaryAccounts();
  if (!accounts.length) {
    throw new Error("Cloudinary is not configured. Configure CLOUDINARY_1_* or the legacy CLOUDINARY_* variables.");
  }

  let lastError: CloudinaryUploadError | null = null;

  for (const account of accounts) {
    if (isAccountTemporarilyUnavailable(account)) continue;

    try {
      const value = await operation(account);
      clearAccountUnavailable(account);
      return { value, account };
    } catch (error) {
      const kind = classifyCloudinaryError(error);
      const wrapped = error instanceof CloudinaryUploadError
        ? error
        : new CloudinaryUploadError(readErrorMessage(error), {
            kind,
            account,
            httpCode: readErrorHttpCode(error),
            cause: error,
          });

      lastError = wrapped;

      console.error("[cloudinary] upload attempt failed", {
        accountId: account.id,
        cloudName: account.cloudName,
        kind,
        httpCode: wrapped.httpCode,
        message: wrapped.message,
      });

      if (!shouldTryAnotherAccount(kind)) {
        throw wrapped;
      }

      markAccountUnavailable(account, kind);
    }
  }

  if (lastError) throw lastError;
  throw new Error("All configured Cloudinary accounts are temporarily unavailable.");
}

export function isSupportedUploadMime(mime: string): boolean {
  return mime.startsWith("image/") || mime.startsWith("video/");
}

const MESSAGE_FILE_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
]);

export function isSupportedMessageAttachmentMime(mime: string): boolean {
  const normalized = String(mime || "").trim().toLowerCase();
  if (!normalized || normalized === "image/svg+xml") return false;
  return normalized.startsWith("image/") || normalized.startsWith("video/") || MESSAGE_FILE_MIME_TYPES.has(normalized);
}

function getResourceType(mimetype: string): CloudinaryResourceType {
  if (mimetype.startsWith("video/")) return "video";
  return mimetype.startsWith("image/") ? "image" : "raw";
}

type CloudinaryMessageTransformation = {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
};

function createCloudinaryUploadStream(
  file: { mimetype: string },
  options: {
    folder?: string;
    resourceType?: CloudinaryResourceType;
    validator?: (mime: string) => boolean;
    transformation?: CloudinaryMessageTransformation[];
  },
  account: CloudinaryAccount,
): {
  stream: ReturnType<typeof cloudinary.uploader.upload_stream>;
  resourceType: CloudinaryResourceType;
  uploadPromise: Promise<CloudinaryUploadAsset>;
} {
  if (!file.mimetype || !(options.validator ?? isSupportedUploadMime)(file.mimetype)) {
    throw new Error("Unsupported file type");
  }

  configureCloudinaryAccount(account);
  const resourceType = options.resourceType ?? getResourceType(file.mimetype);

  let resolveUpload!: (asset: CloudinaryUploadAsset) => void;
  let rejectUpload!: (error: Error) => void;

  const uploadPromise = new Promise<CloudinaryUploadAsset>((resolve, reject) => {
    resolveUpload = resolve;
    rejectUpload = reject;
  });

  const stream = cloudinary.uploader.upload_stream(
    {
      resource_type: resourceType,
      folder: options.folder,
      transformation: options.transformation,
    },
    (error, result) => {
      if (error) {
        rejectUpload(
          error instanceof Error ? error : new Error(readErrorMessage(error)),
        );
        return;
      }

      if (!result?.secure_url || !result.public_id) {
        rejectUpload(new Error("Cloudinary upload returned an incomplete asset"));
        return;
      }

      resolveUpload({
        secureUrl: result.secure_url,
        publicId: result.public_id,
        resourceType,
        bytes: Number(result.bytes ?? 0),
        cloudName: account.cloudName,
        accountId: account.id,
      });
    },
  );

  return { stream, resourceType, uploadPromise };
}

async function uploadFileToCloudinaryAccount(
  file: { path: string; mimetype: string },
  options: { folder?: string },
  account: CloudinaryAccount,
): Promise<CloudinaryMediaUploadAsset> {
  const readStream = createReadStream(file.path);
  const { stream: uploadStream, uploadPromise } = createCloudinaryUploadStream(
    file,
    options,
    account,
  );

  try {
    const asset = await new Promise<CloudinaryUploadAsset>((resolve, reject) => {
      const onReadError = (error: unknown) => {
        const normalized =
          error instanceof Error ? error : new Error("Unable to read upload file");
        uploadStream.destroy(normalized);
        reject(normalized);
      };

      readStream.once("error", onReadError);
      readStream.pipe(uploadStream);
      uploadPromise.then(resolve, reject);
    });

    return {
      ...asset,
      resourceType: asset.resourceType === "video" ? "video" : "image",
    };
  } finally {
    readStream.destroy();
    uploadStream.destroy();
  }
}

export async function uploadFileToCloudinaryAsset(
  file: {
    path: string;
    mimetype: string;
  },
  options: { folder?: string } = {},
): Promise<CloudinaryMediaUploadAsset> {
  if (!file.mimetype || !isSupportedUploadMime(file.mimetype)) {
    throw new Error("Unsupported file type");
  }

  const { value } = await uploadAcrossCloudinaryAccounts((account) =>
    uploadFileToCloudinaryAccount(file, options, account),
  );
  return value;
}

async function uploadBufferToCloudinaryAccount(
  file: { buffer: Buffer; mimetype: string },
  options: {
    folder?: string;
    resourceType?: CloudinaryResourceType;
    validator?: (mime: string) => boolean;
    transformation?: CloudinaryMessageTransformation[];
  },
  account: CloudinaryAccount,
): Promise<CloudinaryUploadAsset> {
  const { stream: uploadStream, uploadPromise } = createCloudinaryUploadStream(
    file,
    options,
    account,
  );
  uploadStream.end(file.buffer);
  return uploadPromise;
}

export async function uploadBufferToCloudinaryAsset(
  file: {
    buffer: Buffer;
    mimetype: string;
  },
  options: { folder?: string } = {},
): Promise<CloudinaryMediaUploadAsset> {
  const { value } = await uploadAcrossCloudinaryAccounts((account) =>
    uploadBufferToCloudinaryAccount(file, {
      folder: options.folder,
    }, account),
  );

  return {
    ...value,
    resourceType: value.resourceType === "video" ? "video" : "image",
  };
}

export async function uploadBufferToCloudinary(
  file: {
    buffer: Buffer;
    mimetype: string;
  },
  options: { folder?: string } = {},
): Promise<string> {
  const asset = await uploadBufferToCloudinaryAsset(file, options);
  return asset.secureUrl;
}

export async function uploadBufferToCloudinaryReviewMedia(
  file: {
    buffer: Buffer;
    mimetype: string;
  },
  options: { folder?: string } = {},
): Promise<CloudinaryUploadAsset> {
  const normalizedMime = String(file.mimetype || "").trim().toLowerCase();
  if (!normalizedMime || !isSupportedUploadMime(normalizedMime) || normalizedMime === "image/svg+xml") {
    throw new Error("Unsupported review media type");
  }

  const resourceType = getResourceType(normalizedMime);
  const transformation = resourceType === "image"
    ? [{ width: 1280, crop: "limit", quality: "auto:good" }]
    : [{ width: 720, crop: "limit", quality: "auto:eco" }];

  const { value } = await uploadAcrossCloudinaryAccounts((account) =>
    uploadBufferToCloudinaryAccount(file, {
      folder: options.folder,
      resourceType,
      validator: (mime) => {
        const value = String(mime || "").trim().toLowerCase();
        return isSupportedUploadMime(value) && value !== "image/svg+xml";
      },
      transformation,
    }, account),
  );

  return value;
}

export async function uploadBufferToCloudinaryMessageAttachment(
  file: {
    buffer: Buffer;
    mimetype: string;
  },
  options: { folder?: string } = {},
): Promise<CloudinaryUploadAsset> {
  if (!file.mimetype || !isSupportedMessageAttachmentMime(file.mimetype)) {
    throw new Error("Unsupported message attachment type");
  }

  const resourceType = getResourceType(file.mimetype);
  const transformation = resourceType === "image"
    ? [{ width: 1280, crop: "limit", quality: "auto:good" }]
    : resourceType === "video"
      ? [{ width: 720, crop: "limit", quality: "auto:eco" }]
      : undefined;

  const { value } = await uploadAcrossCloudinaryAccounts((account) =>
    uploadBufferToCloudinaryAccount(file, {
      folder: options.folder,
      resourceType,
      validator: isSupportedMessageAttachmentMime,
      transformation,
    }, account),
  );

  return value;
}

export function cloudinaryAttachmentSourceUrl(secureUrl: string): string {
  if (!secureUrl.includes("/raw/upload/")) return secureUrl;
  return secureUrl.replace(/\/raw\/upload\/fl_attachment:[^/]+\//, "/raw/upload/");
}

export async function deleteCloudinaryAsset(asset: {
  publicId: string;
  resourceType: CloudinaryResourceType;
  secureUrl?: string | null;
  cloudName?: string | null;
}): Promise<void> {
  if (!asset.publicId) return;

  const account =
    getAccountForCloudName(asset.cloudName) ??
    getAccountForCloudName(getCloudNameFromSecureUrl(asset.secureUrl));

  if (!account) {
    throw new Error(
      "Unable to determine the Cloudinary account for this asset. Provide secureUrl or cloudName.",
    );
  }

  configureCloudinaryAccount(account);

  await new Promise<void>((resolve, reject) => {
    cloudinary.uploader.destroy(
      asset.publicId,
      {
        resource_type: asset.resourceType,
        invalidate: true,
      },
      (error, result) => {
        if (error) {
          reject(
            new CloudinaryUploadError(readErrorMessage(error), {
              kind: classifyCloudinaryError(error),
              account,
              httpCode: readErrorHttpCode(error),
              cause: error,
            }),
          );
          return;
        }

        const resultStatus = String(result?.result ?? "").toLowerCase();
        if (resultStatus && !["ok", "not found"].includes(resultStatus)) {
          reject(new Error(`Cloudinary deletion failed: ${resultStatus}`));
          return;
        }

        resolve();
      },
    );
  });
}
