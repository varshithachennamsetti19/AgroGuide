/**
 * Pluggable Storage Service
 * Supports S3, Cloudinary, Azure Blob, and local file storage fallbacks (Phase 10)
 */

import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import { v2 as cloudinary } from 'cloudinary';

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';

// 1. Configure Cloudinary if active
if (STORAGE_PROVIDER === 'cloudinary') {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

/**
 * Uploads diagnostic leaf photos to configured storage providers.
 * Falls back to local directory in development.
 */
export async function uploadImageToStorage(file) {
  console.log(`[Storage] Uploading leaf sample using provider: ${STORAGE_PROVIDER.toUpperCase()}`);

  if (STORAGE_PROVIDER === 's3') {
    try {
      const bucketName = process.env.AWS_S3_BUCKET_NAME || 'agroguide-bucket';
      const key = `diagnoses/${Date.now()}-${file.originalname}`;
      
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'mock',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'mock'
        }
      });

      const fileBuffer = fs.readFileSync(file.path);
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: file.mimetype || 'image/jpeg',
        ACL: 'public-read'
      }));

      return {
        success: true,
        filePath: file.path,
        fileUrl: `https://${bucketName}.s3.amazonaws.com/${key}`
      };
    } catch (error) {
      console.error('[AWS S3] Upload failed:', error.message);
      throw new Error(`S3 Storage upload failed: ${error.message}`);
    }
  }

  if (STORAGE_PROVIDER === 'cloudinary') {
    try {
      // Cloudinary expects file path
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'agroguide'
      });
      return {
        success: true,
        filePath: file.path,
        fileUrl: result.secure_url
      };
    } catch (error) {
      console.error('[Cloudinary] Upload failed:', error.message);
      throw new Error(`Cloudinary Storage upload failed: ${error.message}`);
    }
  }

  if (STORAGE_PROVIDER === 'azure') {
    try {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const containerName = process.env.AZURE_CONTAINER_NAME || 'agroguide-uploads';
      
      if (!connectionString) {
        throw new Error('Azure connection string missing.');
      }

      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      const containerClient = blobServiceClient.getContainerClient(containerName);
      
      // Create container if it doesn't exist
      await containerClient.createIfNotExists({ access: 'container' });

      const blobName = `${Date.now()}-${file.filename}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      const fileBuffer = fs.readFileSync(file.path);
      await blockBlobClient.upload(fileBuffer, fileBuffer.length);

      return {
        success: true,
        filePath: file.path,
        fileUrl: blockBlobClient.url
      };
    } catch (error) {
      console.error('[Azure Blob] Upload failed:', error.message);
      throw new Error(`Azure Storage upload failed: ${error.message}`);
    }
  }

  // Default: Local File System Storage (Development)
  const fileUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/uploads/${file.filename}`;
  return {
    success: true,
    filePath: file.path,
    fileUrl: `/uploads/${file.filename}` // relative router path for local Nginx volumes mapping
  };
}
