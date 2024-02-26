import { createServer } from 'http';
import { parse } from 'node:url';
import next from 'next';
import { initSocketIO } from '@/backend/socketio';
import setting, {reloadSettings} from '@/backend/Setting';
import { initDatabase } from '@/backend/DB';
import fastify from 'fastify';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev });
const handle = app.getRequestHandler();
import {settings} from '@/backend/exportedVars';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { initAPIRoots } from '@/api/initAPIRoots';
let server: any;
reloadSettings();

await app.prepare();


const serverFactory = (handler: any, opts:any) => {
  server = createServer(async (req, res) => {

    if (req.url?.startsWith('/api')) {
      return handler(req, res);
    } else {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    }
  });

  return server;
};

export const fastifyServer = fastify({
  serverFactory,
  logger:true,
  trustProxy: settings.trustProxy
});

initSocketIO(server);


fastifyServer.ready(async (err) => {
  server.listen({
    port: settings.port
  });
});

initAPIRoots();
