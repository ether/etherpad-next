import type { WebSocket, WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

// next-ws didn't realy build route so we forced using get route
export const GET = () =>
  Response.json(
    {
      message:
        "This is a WebSocket route!\n You should not be here unless you're a WebSocket client.",
    },
    { status: 418 }
  );

export const SOCKET = (
  client: WebSocket,
  request: Request,
  server: WebSocketServer
) => {
  console.log('A client connected!');

  server.on('connection', setupWSConnection);

  // client.on('message', message => {
  //   client.send(message);
  // });

  // client.on('close', () => {
  //   console.log('A client disconnected!');
  // });
};