import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type CloudinaryResourceType = "image" | "video";

export type CloudinaryUploadAsset = {
  secureUrl: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
};

export function isSupportedUploadMime(mime: string): boolean {
  return mime.startsWith("image/") || mime.startsWith("video/");
}

export async function uploadBufferToCloudinaryAsset(
  file: {
    buffer: Buffer;
    mimetype: string;
  },
  options: { folder?: string } = {},
): Promise<CloudinaryUploadAsset> {
  if (!file.mimetype || !isSupportedUploadMime(file.mimetype)) {
    throw new Error("Unsupported file type");
  }

  const resourceType: CloudinaryResourceType = file.mimetype.startsWith("video/")
    ? "video"
    : "image";

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: options.folder,
      },
      (error, result) => {
        if (error) {
          reject(
            error instanceof Error
              ? error
              : new Error("Cloudinary upload failed"),
          );
          return;
        }

        if (!result?.secure_url || !result.public_id) {
          reject(new Error("Cloudinary upload returned an incomplete asset"));
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          resourceType,
        });
      },
    );

    uploadStream.end(file.buffer);
  });
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
