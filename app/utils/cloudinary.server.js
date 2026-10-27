import path from "path";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

// Explicitly load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Upload base64 data string or buffer to Cloudinary
 * @param {string} fileStr - base64 data URI (e.g., data:image/png;base64,...)
 * @param {object} options - upload options (folder, resource_type, etc.)
 */
export async function uploadToCloudinary(fileStr, options = {}) {
  // Try reading from process.env, and re-read .env if empty
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  let apiKey = process.env.CLOUDINARY_API_KEY;
  let apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
    cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    apiKey = process.env.CLOUDINARY_API_KEY;
    apiSecret = process.env.CLOUDINARY_API_SECRET;
  }

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(`Cloudinary credentials incomplete. cloud_name: ${Boolean(cloudName)}, api_key: ${Boolean(apiKey)}, api_secret: ${Boolean(apiSecret)}`);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const defaultFolder = "reviora-reviews";
  const resourceType = options.resource_type || "auto"; // "auto" detects images & videos

  const result = await cloudinary.uploader.upload(fileStr, {
    folder: options.folder || defaultFolder,
    resource_type: resourceType,
    transformation: resourceType === "image" ? [{ quality: "auto", fetch_format: "auto" }] : undefined,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    resourceType: result.resource_type, // "image" or "video"
  };
}

export default cloudinary;
