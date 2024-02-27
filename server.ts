import { createServer } from 'http';
import { parse } from 'node:url';
import next from 'next';
import { initSocketIO } from '@/backend/socketio';
import { logConfig, reloadSettings } from '@/backend/Setting';
import { initDatabase } from '@/backend/DB';
import fastify, { FastifyInstance } from 'fastify';
import fastifyExpress from '@fastify/express';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev });
const handle = app.getRequestHandler();
import { initAPIRoots } from '@/api/initAPIRoots';
import { getAPIKey } from '@/backend/APIHandler';
let server: any;

export let settingsLoaded = reloadSettings();
export let fastifyServer: FastifyInstance;
export const start = async () => {
  await initDatabase(settingsLoaded);

  await app.prepare();

  const serverFactory = (handler: any) => {
    server = createServer(async (req, res) => {
      if (
        req.url?.startsWith('/api') ||
        req.url?.startsWith('/socket.io') ||
        req.url?.startsWith('/api-docs') ||
        req.url?.startsWith('/api/documentation') ||
        req.url?.startsWith('/swagger-ui') ||
        req.url?.startsWith('/swagger')
      ) {
        return handler(req, res);
      } else {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      }
    });

    return server;
  };

  fastifyServer = fastify({
    serverFactory,
    logger: logConfig,
    trustProxy: settingsLoaded.trustProxy,
  });
  await fastifyServer.register(fastifyExpress);
  fastifyServer.use((req, res, next) => {
    if (
      req.query.apikey === getAPIKey() ||
      req.headers.apikey === getAPIKey() ||
      req.path.startsWith('/api-docs') ||
      req.path.startsWith('/api/documentation') ||
      req.path.startsWith('/swagger-ui') ||
      req.path.startsWith('/swagger')
    ) {
      next();
    } else {
      res.status(401).send('Unauthorized');
    }
  });

  await fastifyServer.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'Swagger UI for Etherpad next',
        description: 'API documentation for Etherpad next',
        version: settingsLoaded.getEpVersion(),
      },
      externalDocs: {
        url: 'https://etherpad.org',
        description: 'Find more info here',
      },
      host: `localhost:${settingsLoaded.port}`,
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'pad', description: 'Pad related end-points' },
        { name: 'author', description: 'Author related end-points' },
        { name: 'group', description: 'Group related end-points' },
        { name: 'session', description: 'Session related end-points' },
      ],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'apiKey',
          in: 'query',
        },
      },
    },
  });

  await fastifyServer.register(fastifySwaggerUi, {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: header => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  fastifyServer.setErrorHandler((error, request, reply) => {
    fastifyServer.log.error(error);
    reply.send({ error: 'Something went wrong' });
  });

  initSocketIO(server);

  console.log(`Starting Etherpad on port ${settingsLoaded.port}`);
  fastifyServer.ready(async () => {
    server.listen({
      port: settingsLoaded.port,
    });
  });

  initAPIRoots();
};

if (import.meta.url === new URL(import.meta.url).href) {
  await start();
}

export const exit = async (force?: boolean) => {
  if (force) {
    process.exit(1);
  }
  await fastifyServer.close();
  await server.close();
  await app.close();
};
