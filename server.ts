import { createServer } from 'http';
import { parse } from 'node:url';
import next from 'next';
import { initSocketIO } from '@/backend/socketio';
import { logConfig, reloadSettings } from '@/backend/Setting';
import { initDatabase } from '@/backend/DB';
import fastify, { FastifyInstance } from 'fastify';
import fastifyExpress from '@fastify/express';

const dev = process.env.NODE_ENV !== 'production';
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev });
const handle = app.getRequestHandler();

import { getAPIKey } from '@/backend/APIHandler';
import { EVENT_EMITTER } from '@/hooks/Hook';
import { serverPreReady, serverReady } from '@/hooks/constants';
import "./api/initAPIRoots";
import { initFastifyPlugins } from '@/api/swagger/initSwagger';
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

  fastifyServer = await fastify({
    serverFactory,
    logger: logConfig,
    trustProxy: settingsLoaded.trustProxy,
  });

  EVENT_EMITTER.emit(serverPreReady, fastifyServer);

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

  await initFastifyPlugins(fastifyServer);
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

  EVENT_EMITTER.emit(serverReady, fastifyServer);
};

if (import.meta.url === new URL(import.meta.url).href) {
  await start();
}

