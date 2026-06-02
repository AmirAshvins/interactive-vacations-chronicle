import { HeadObjectCommand, PutObjectCommand, S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../env.js';
import type { StorageAdapter } from './types.js';
import { uploadExpiresAt } from './uploadToken.js';

export function createR2Storage(): StorageAdapter {
  const client = new S3Client({
    region: 'auto',
    endpoint: env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });

  return {
    mode: 'r2',
    getPublicUrl(storageKey: string) {
      return `${env.storagePublicBaseUrl}/${storageKey}`;
    },
    async getPresignedPutUrl(storageKey, mimeType, sizeBytes) {
      const expiresAt = uploadExpiresAt();
      const command = new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: storageKey,
        ContentType: mimeType,
        ContentLength: sizeBytes,
      });
      const uploadUrl = await getSignedUrl(client, command, {
        expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      });
      return { uploadUrl, expiresAt };
    },
    async headObject(storageKey) {
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: storageKey,
          }),
        );
        return true;
      } catch {
        return false;
      }
    },
    async deleteObject(storageKey) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: env.R2_BUCKET,
          Key: storageKey,
        }),
      );
    },
  };
}
