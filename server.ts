import { createServer } from 'http';
import { parse } from 'node:url';
import next from 'next';
import { initSocketIO } from '@/backend/socketio';
import settings from '@/backend/Setting';
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev });
const handle = app.getRequestHandler();

let server: any;
let settingsLoaded = settings.reloadSettings();

app.prepare().then(() => {
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

  server.once('error', (err: any) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(settingsLoaded.port, () => {
    console.log(
      `> Ready on ${settingsLoaded.ssl ? 'https' : 'http'}://${hostname}:${settingsLoaded.port}`
    );
  });
});
