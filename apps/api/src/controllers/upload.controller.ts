import type { Request, Response } from "express";
import { uploadService } from "../services/upload.service.js";
import { ValidationError } from "../errors/http-errors.js";

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0]! : val!;
}

export const uploadController = {
  async handleUpload(req: Request, res: Response): Promise<void> {
    const profileId = getParam(req, "id");
    const file = req.file;

    if (!file) {
      throw new ValidationError("No file attached to upload request");
    }

    const uploaded = await uploadService.uploadPrivateAsset(profileId, {
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });

    res.status(201).json({
      uploadId: uploaded.uploadId,
      privateUrl: uploaded.privateUrl,
      fileType: uploaded.fileType,
      bytes: uploaded.bytes,
    });
  },

  async serveMockUpload(req: Request, res: Response): Promise<void> {
    const uploadId = getParam(req, "uploadId");
    const asset = uploadService.getMockAsset(uploadId);

    if (!asset) {
      res.status(404).end();
      return;
    }

    res.setHeader("Content-Type", asset.fileType);
    res.setHeader("Content-Length", asset.bytes);
    res.status(200).send(asset.buffer);
  },
};
