import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { useServer } from 'graphql-ws/use/ws';
import { WebSocketServer } from 'ws';
import { checkDatabaseConnection } from './db/index.js';
import { createContextFactory, createWsContext } from './context.js';
import { env } from './env.js';
import { graphqlPlugins, schema } from './graphql/schema.js';
import { verifyAccessToken } from './auth/jwt.js';
import { handleStorageRequest } from './http/storageRoutes.js';
import { getStorage } from './services/storage/index.js';

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  landingPage: false,
  graphiql: env.NODE_ENV !== 'production',
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
  context: createContextFactory(),
  plugins: graphqlPlugins,
});

const httpServer = createServer((req, res) => {
  const url = req.url?.split('?')[0] ?? '/';

  if (req.method === 'GET' && url === '/health') {
    void checkDatabaseConnection().then((dbOk) => {
      res.writeHead(dbOk ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: dbOk,
          service: '@ivc/api',
          phase: '5',
          graphql: true,
          subscriptions: true,
          storage: getStorage().mode,
          database: dbOk ? 'connected' : 'unavailable',
        }),
      );
    });
    return;
  }

  void handleStorageRequest(req, res, url).then((handled) => {
    if (handled) return;
    yoga(req, res);
  });
});

const wsServer = new WebSocketServer({
  server: httpServer,
  path: yoga.graphqlEndpoint,
});

const wsCleanup = useServer(
  {
    schema,
    context: async (ctx: { connectionParams?: Record<string, unknown> }) =>
      createWsContext(ctx.connectionParams),
    onConnect: async (ctx: { connectionParams?: Record<string, unknown> }) => {
      const raw = ctx.connectionParams?.Authorization;
      if (typeof raw !== 'string' || !raw) return false;
      const token = raw.replace(/^Bearer\s+/i, '');
      const payload = await verifyAccessToken(token);
      return payload !== null;
    },
  },
  wsServer,
);

httpServer.listen(env.PORT, () => {
  console.log(`@ivc/api listening on http://localhost:${env.PORT}`);
  console.log(`  health   GET  /health`);
  console.log(`  graphql  POST /graphql`);
  console.log(`  graphql  WS   /graphql (subscriptions)`);
  console.log(`  storage  ${getStorage().mode} → ${env.storagePublicBaseUrl}`);
  if (env.NODE_ENV !== 'production') {
    console.log(`  graphiql GET  /graphql`);
  }
});

process.on('SIGTERM', () => {
  wsCleanup.dispose();
});

process.on('SIGINT', () => {
  wsCleanup.dispose();
});
