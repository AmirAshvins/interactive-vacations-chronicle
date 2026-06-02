import { createServer } from 'node:http';
import { createYoga } from 'graphql-yoga';
import { checkDatabaseConnection } from './db/index.js';
import { createContextFactory } from './context.js';
import { env } from './env.js';
import { graphqlPlugins, schema } from './graphql/schema.js';

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

const server = createServer((req, res) => {
  const url = req.url?.split('?')[0] ?? '/';

  if (req.method === 'GET' && url === '/health') {
    void checkDatabaseConnection().then((dbOk) => {
      res.writeHead(dbOk ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: dbOk,
          service: '@ivc/api',
          phase: '1',
          graphql: true,
          database: dbOk ? 'connected' : 'unavailable',
        }),
      );
    });
    return;
  }

  yoga(req, res);
});

server.listen(env.PORT, () => {
  console.log(`@ivc/api listening on http://localhost:${env.PORT}`);
  console.log(`  health   GET  /health`);
  console.log(`  graphql  POST /graphql`);
  if (env.NODE_ENV !== 'production') {
    console.log(`  graphiql GET  /graphql`);
  }
});
