import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { SyncDelta } from '@ivc/shared';

const PORT = Number(process.env.PORT ?? 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
  });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Phase 1 replaces this stub with GraphQL Yoga + subscriptions. */
const server = createServer(async (req, res) => {
  const url = req.url ?? '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: '@ivc/api',
      phase: 'scaffold',
      graphql: false,
    });
    return;
  }

  if (req.method === 'POST' && url === '/graphql') {
    try {
      const raw = await readBody(req);
      const payload = raw ? (JSON.parse(raw) as { operationName?: string }) : {};
      if (payload.operationName === 'IntrospectionQuery') {
        sendJson(res, 200, { data: { __schema: { queryType: { name: 'Query' } } } });
        return;
      }
      sendJson(res, 501, {
        errors: [{ message: 'GraphQL API not implemented yet — Phase 1.' }],
      });
    } catch {
      sendJson(res, 400, { errors: [{ message: 'Invalid JSON body' }] });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  const emptySync: SyncDelta = { travelogueVersion: 0, patches: [] };
  console.log(`@ivc/api listening on http://localhost:${PORT}`);
  console.log(`  health   GET  /health`);
  console.log(`  graphql  POST /graphql (stub — shared types wired: ${emptySync.patches.length} patches)`);
});
