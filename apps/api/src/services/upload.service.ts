import crypto from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import {
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
  NotFoundError,
} from "../errors/http-errors.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export interface UploadedAsset {
  uploadId: string;
  privateUrl: string;
  fileType: string;
  bytes: number;
  buffer?: Buffer;
}

// In-memory mock storage for dev/test when Cloudinary is not configured
const mockUploadStore = new Map<
  string,
  {
    uploadId: string;
    buffer: Buffer;
    fileType: string;
    bytes: number;
    createdAt: Date;
  }
>();

// Initialize Cloudinary if credentials exist
if (env.CLOUDINARY_URL) {
  cloudinary.config({ cloudinary_url: env.CLOUDINARY_URL });
} else if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const uploadService = {
  validateFile(file?: { mimetype: string; size: number; buffer?: Buffer }): void {
    if (!file) {
      throw new ValidationError("No file provided for upload");
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new UnsupportedMediaTypeError(
        `Unsupported media type: ${file.mimetype}. Allowed types: image/jpeg, image/png, application/pdf`,
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeError("File size exceeds 10MB limit");
    }
  },

  async uploadPrivateAsset(
    profileId: string,
    file: { mimetype: string; size: number; buffer: Buffer },
  ): Promise<UploadedAsset> {
    this.validateFile(file);

    const uploadId = crypto.randomUUID();
    const isCloudinaryConfigured = Boolean(
      env.CLOUDINARY_URL || (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY),
    );

    if (isCloudinaryConfigured) {
      // Cloudinary private upload with authenticated delivery
      const result = await new Promise<{ public_id: string; format: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `saath/${profileId}`,
            public_id: uploadId,
            type: "authenticated",
            resource_type: file.mimetype === "application/pdf" ? "raw" : "image",
          },
          (err, res) => {
            if (err || !res) {
              return reject(err ?? new Error("Cloudinary upload failed"));
            }
            resolve({ public_id: res.public_id, format: res.format || "jpg" });
          },
        );
        uploadStream.end(file.buffer);
      });

      // Generate 1-hour signed private delivery URL
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const privateUrl = cloudinary.utils.private_download_url(result.public_id, result.format, {
        expires_at: expiresAt,
        type: "authenticated",
      });

      return {
        uploadId,
        privateUrl,
        fileType: file.mimetype,
        bytes: file.size,
      };
    }

    // Dev/test local mock storage
    mockUploadStore.set(uploadId, {
      uploadId,
      buffer: file.buffer,
      fileType: file.mimetype,
      bytes: file.size,
      createdAt: new Date(),
    });

    const mockSignedUrl = `http://localhost:${env.PORT}/api/mock-uploads/${uploadId}`;
    return {
      uploadId,
      privateUrl: mockSignedUrl,
      fileType: file.mimetype,
      bytes: file.size,
      buffer: file.buffer,
    };
  },

  getMockAsset(
    uploadId: string,
  ): { uploadId: string; buffer: Buffer; fileType: string; bytes: number } | undefined {
    const asset = mockUploadStore.get(uploadId);
    if (!asset) {
      throw new NotFoundError("Upload not found");
    }
    return asset;
  },
};
