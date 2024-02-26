import events from 'node:events';
import { Http2Server } from 'node:http2';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from '@socket.io/component-emitter';

let io: Server<DefaultEventsMap, DefaultEventsMap> | undefined;
const sockets = new Set();
const sessionInfos = new Map();

export const socketsEvents = new events.EventEmitter();

export const initSocketIO = (server: Http2Server) => {
  io = new Server(server, { addTrailingSlash: false });

  io.on('connect', socket => {
    socketsEvents.emit('session-connected', socket);
    socket.on('disconnect', async () => {
      socketsEvents.emit('session-disconnected', socket);
      console.log('socket disconnect');
    });
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
