import { createReadStream } from "node:fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type CloudinaryResourceType = "image" | "video" | "raw";

export type CloudinaryUploadAsset = {
  secureUrl: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  bytes: number;
};

export type CloudinaryMediaUploadAsset = Omit<CloudinaryUploadAsset, "resourceType"> & {
  resourceType: "image" | "video";
};

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
): {
  stream: ReturnType<typeof cloudinary.uploader.upload_stream>;
  resourceType: CloudinaryResourceType;
  uploadPromise: Promise<CloudinaryUploadAsset>;
} {
  if (!file.mimetype || !(options.validator ?? isSupportedUploadMime)(file.mimetype)) {
    throw new Error("Unsupported file type");
  }

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
          error instanceof Error ? error : new Error("Cloudinary upload failed"),
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
      });
    },
  );

  return { stream, resourceType, uploadPromise };
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

  const readStream = createReadStream(file.path);
  const { stream: uploadStream, uploadPromise } = createCloudinaryUploadStream(
    file,
    options,
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

export async function uploadBufferToCloudinaryAsset(
  file: {
    buffer: Buffer;
    mimetype: string;
  },
  options: { folder?: string } = {},
): Promise<CloudinaryMediaUploadAsset> {
  const { stream: uploadStream, uploadPromise } = createCloudinaryUploadStream(
    file,
    options,
  );

  uploadStream.end(file.buffer);
  const asset = await uploadPromise;
  return {
    ...asset,
    resourceType: asset.resourceType === "video" ? "video" : "image",
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
): Promise<CloudinaryMediaUploadAsset> {
  if (!file.mimetype || !(file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/"))) {
    throw new Error("Unsupported review media type");
  }

  const resourceType: "image" | "video" = file.mimetype.startsWith("video/") ? "video" : "image";
  const transformation = resourceType === "image"
    ? [{ width: 1280, crop: "limit", quality: "auto:good" }]
    : [{ width: 720, crop: "limit", quality: "auto:eco" }];

  const { stream, uploadPromise } = createCloudinaryUploadStream(file, {
    folder: options.folder,
    resourceType,
    validator: (mime) => {
      const normalized = String(mime || "").trim().toLowerCase();
      return resourceType === "image"
        ? normalized.startsWith("image/") && normalized !== "image/svg+xml"
        : normalized.startsWith("video/");
    },
    transformation,
  });

  stream.end(file.buffer);
  const asset = await uploadPromise;

  return {
    ...asset,
    resourceType,
  };
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

  return new Promise<CloudinaryUploadAsset>((resolve, reject) => {
    try {
      const { stream, uploadPromise } = createCloudinaryUploadStream(file, {
        folder: options.folder,
        resourceType,
        validator: isSupportedMessageAttachmentMime,
        transformation,
      });
      uploadPromise.then(resolve, reject);
      stream.end(file.buffer);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Cloudinary upload failed"));
    }
  });
}

export function cloudinaryAttachmentSourceUrl(secureUrl: string): string {
  if (!secureUrl.includes("/raw/upload/")) return secureUrl;
  return secureUrl.replace(/\/raw\/upload\/fl_attachment:[^/]+\//, "/raw/upload/");
}

export async function deleteCloudinaryAsset(asset: {
  publicId: string;
  resourceType: CloudinaryResourceType;
}): Promise<void> {
  if (!asset.publicId) return;

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
            error instanceof Error
              ? error
              : new Error("Cloudinary deletion failed"),
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
