import { mkdir, readFile, writeFile, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../env.js';
import type { StorageAdapter } from './types.js';
import { createUploadToken, uploadExpiresAt } from './uploadToken.js';

async function filePathForKey(storageKey: string): Promise<string> {
  const root = path.resolve(env.LOCAL_STORAGE_DIR);
  const full = path.join(root, storageKey);
  if (!full.startsWith(root + path.sep)) {
    throw new Error('Invalid storage key');
  }
  await mkdir(path.dirname(full), { recursive: true });
  return full;
}

export function createLocalStorage(): StorageAdapter {
  return {
    mode: 'local',
    getPublicUrl(storageKey: string) {
      return `${env.storagePublicBaseUrl}/${storageKey}`;
    },
    async getPresignedPutUrl(storageKey, _mimeType, _sizeBytes) {
      const expiresAt = uploadExpiresAt();
      const token = createUploadToken(storageKey, expiresAt);
      const uploadUrl = `http://localhost:${env.PORT}/storage/put?key=${encodeURIComponent(storageKey)}&token=${encodeURIComponent(token)}`;
      return { uploadUrl, expiresAt };
    },
    async headObject(storageKey) {
      try {
        await access(await filePathForKey(storageKey));
        return true;
      } catch {
        return false;
      }
    },
    async deleteObject(storageKey) {
      try {
        await unlink(await filePathForKey(storageKey));
      } catch {
        /* ignore missing */
      }
    },
  };
}

export async function writeLocalObject(storageKey: string, body: Buffer): Promise<void> {
  const filePath = await filePathForKey(storageKey);
  await writeFile(filePath, body);
}

export async function readLocalObject(storageKey: string): Promise<Buffer | null> {
  try {
    return await readFile(await filePathForKey(storageKey));
  } catch {
    return null;
  }
}
