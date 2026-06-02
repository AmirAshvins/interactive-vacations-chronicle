import type { IncomingMessage, ServerResponse } from 'node:http';
import { env } from '../env.js';
import { readLocalObject, writeLocalObject } from '../services/storage/local.js';
import { verifyUploadToken } from '../services/storage/uploadToken.js';

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function contentTypeForKey(key: string): string {
  if (key.endsWith('.webp')) return 'image/webp';
  if (key.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

export async function handleStorageRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (env.storageMode !== 'local') return false;

  if (req.method === 'PUT' && pathname === '/storage/put') {
    const url = new URL(req.url ?? '/', `http://localhost:${env.PORT}`);
    const key = url.searchParams.get('key');
    const token = url.searchParams.get('token');
    if (!key || !token || !verifyUploadToken(token, key)) {
      res.writeHead(403);
      res.end('Forbidden');
      return true;
    }
    const body = await readBody(req);
    await writeLocalObject(key, body);
    res.writeHead(204);
    res.end();
    return true;
  }

  const mediaPrefix = '/storage/media/';
  if (req.method === 'GET' && pathname.startsWith(mediaPrefix)) {
    const key = decodeURIComponent(pathname.slice(mediaPrefix.length));
    const body = await readLocalObject(key);
    if (!body) {
      res.writeHead(404);
      res.end('Not found');
      return true;
    }
    res.writeHead(200, {
      'Content-Type': contentTypeForKey(key),
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.end(body);
    return true;
  }

  return false;
}
