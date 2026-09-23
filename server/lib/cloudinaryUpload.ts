import { createReadStream } from "node:fs";
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

function getResourceType(mimetype: string): CloudinaryResourceType {
  return mimetype.startsWith("video/") ? "video" : "image";
}

function createCloudinaryUploadStream(
  file: { mimetype: string },
  options: { folder?: string },
): {
  stream: ReturnType<typeof cloudinary.uploader.upload_stream>;
  resourceType: CloudinaryResourceType;
  uploadPromise: Promise<CloudinaryUploadAsset>;
} {
  if (!file.mimetype || !isSupportedUploadMime(file.mimetype)) {
    throw new Error("Unsupported file type");
  }

  const resourceType = getResourceType(file.mimetype);

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
): Promise<CloudinaryUploadAsset> {
  if (!file.mimetype || !isSupportedUploadMime(file.mimetype)) {
    throw new Error("Unsupported file type");
  }

  const readStream = createReadStream(file.path);
  const { stream: uploadStream, uploadPromise } = createCloudinaryUploadStream(
    file,
    options,
  );

  try {
    return await new Promise<CloudinaryUploadAsset>((resolve, reject) => {
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
): Promise<CloudinaryUploadAsset> {
  const { stream: uploadStream, uploadPromise } = createCloudinaryUploadStream(
    file,
    options,
  );

  uploadStream.end(file.buffer);
  return uploadPromise;
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
