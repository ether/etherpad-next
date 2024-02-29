import events from 'node:events';
import { Http2Server } from 'node:http2';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from '@socket.io/component-emitter';
import { settingsLoaded } from '@/server';
// @ts-ignore
import expressSession from 'express-session';
import proxyaddr from 'proxy-addr';
import { SessionStore } from '@/backend/session/SessionStore';

export let io: Server<DefaultEventsMap, DefaultEventsMap> | undefined;
const sockets = new Set();
const sessionInfos = new Map<string, {
  connected: boolean;
  lastConnected: Date;
}>();

export const socketsEvents = new events.EventEmitter();
export const sessionStore = new SessionStore();

let sessionMiddleware: any;

const socketSessionMiddleware = (args: any) => (socket: any, next: Function) => {
  const req = socket.request;
  // Express sets req.ip but socket.io does not. Replicate Express's behavior here.
  if (req.ip == null) {
    if (settingsLoaded.trustProxy) {
      req.ip = proxyaddr(req, args.app.get('trust proxy fn'));
    } else {
      req.ip = socket.handshake.address;
    }
  }
  if (!req.headers.cookie) {
    // socketio.js-client on node.js doesn't support cookies, so pass them via a query parameter.
    req.headers.cookie = socket.handshake.query.cookie;
  }
  sessionMiddleware(req, {}, next);
};


export const initSocketIO = (server: Http2Server) => {
  io = new Server(server, { addTrailingSlash: false, cookie: false, maxHttpBufferSize: settingsLoaded.socketIo.maxHttpBufferSize });

  new SessionStore();

  sessionMiddleware = expressSession({
    propagateTouch: true,
    rolling: true,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    // Set the cookie name to a javascript identifier compatible string. Makes code handling it
    // cleaner :)
    name: 'express_sid',
    cookie: {
      maxAge: 60 || null, // Convert 0 to null.
      sameSite: settingsLoaded.cookie.sameSite,

      // The automatic express-session mechanism for determining if the application is being served
      // over ssl is similar to the one used for setting the language cookie, which check if one of
      // these conditions is true:
      //
      //   1. we are directly serving the nodejs application over SSL, using the "ssl" options in
      //      settings.json
      //
      //   2. we are serving the nodejs application in plaintext, but we are using a reverse proxy
      //      that terminates SSL for us. In this case, the user has to set trustProxy = true in
      //      settings.json, and the information wheter the application is over SSL or not will be
      //      extracted from the X-Forwarded-Proto HTTP header
      //
      // Please note that this will not be compatible with applications being served over http and
      // https at the same time.
      //
      // reference: https://github.com/expressjs/session/blob/v1.17.0/README.md#cookiesecure
      secure: 'auto',
    },
  });

  io.on('connect', socket => {
    socketsEvents.emit('session-connected', socket);
    socket.on('disconnect', async () => {
      socketsEvents.emit('session-disconnected', socket);
      console.log('socket disconnect');
    });
  });

  io.of('/pad').use(socketSessionMiddleware(settingsLoaded));


  io.of('/pad').on('connection', socket => {
    socket.join('pad');
  });
};

socketsEvents.on('session-connected', (socket: Socket<DefaultEventsMap>) => {
  sessionInfos.set(socket.id, {
    connected: true,
    lastConnected: new Date(),
  });
});

socketsEvents.on('session-disconnected', (socket: Socket<DefaultEventsMap>) => {
  sessionInfos.delete(socket.id);
});
