import { createServer } from 'http';
import { parse } from 'node:url';
import next from 'next';
import { initSocketIO } from '@/backend/socketio';
import  {reloadSettings} from '@/backend/Setting';
import { initDatabase } from '@/backend/DB';
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev });
const handle = app.getRequestHandler();
import {settings} from '@/backend/exportedVars'
let server: any;
reloadSettings();

app.prepare().then(async () => {
  server = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  initSocketIO(server);
  const db = await initDatabase();

  server.once('error', (err: any) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(settings.port, () => {
    console.log(
      `> Ready on ${settings.ssl ? 'https' : 'http'}://${hostname}:${settings.port}`
    );
  });
});
