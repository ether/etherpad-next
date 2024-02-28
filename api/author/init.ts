import { fastifyServer } from '@/server';
import {
  createAuthor,
  createAuthorIfNotExistsFor,
  getAuthorName,
  listPadsOfAuthor,
} from '@/service/pads/AuthorManager';
import {
  BASE_PATH_AUTHOR_GET,
  BASE_PATH_AUTHOR_PAD,
  BASE_PATH_AUTHORS,
} from '@/api/constants';
import { EVENT_EMITTER } from '@/hooks/Hook';


EVENT_EMITTER.on('fastifyServerReady', async () => {
  initAuthor();

});

export const initAuthor = () => {
  fastifyServer.post<{
    Body: {
      authorName: string;
      authorMapper?: string;
      ifNotExists?: boolean;
    };
  }>(
    BASE_PATH_AUTHORS,
    {
      schema: {
        tags: ['author'],
        body: {
          type: 'object',
          properties: {
            authorName: { type: 'string' },
            authorMapper: { type: 'string' },
            ifNotExists: { type: 'boolean' },
          },
          required: ['authorName'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: {
                type: 'object',
                properties: {},
              },
            },
          },
          500: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (req, res) => {
      const { authorName, authorMapper, ifNotExists } = req.body;
      try {
        let author;

        if (ifNotExists) {
          author = await createAuthorIfNotExistsFor(authorMapper!, authorName);
        } else {
          author = await createAuthor(authorName);
        }

        return {
          code: 0,
          data: {
            author,
          },
          message: 'ok',
        };
      } catch (e: any) {
        res.status(500);
        return {
          code: 1,
          message: e.message,
        };
      }
    }
  );

  fastifyServer.get<{
    Params: {
      authorId?: string;
    };
  }>(
    BASE_PATH_AUTHOR_PAD,
    {
      schema: {
        tags: ['author'],
        querystring: {
          authorName: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: {
                type: 'object',
                properties: {},
              },
            },
          },
        },
      },
    },
    async (req, res) => {
      const { authorId } = req.params;

      try {
        const author = await listPadsOfAuthor(authorId!);
        return {
          code: 0,
          data: {
            author,
          },
          message: 'ok',
        };
      } catch (e: any) {
        return {
          code: 1,
          message: e.message,
        };
      }
    }
  );

  fastifyServer.get<{
    Params: {
      authorName: string;
    };
  }>(
    BASE_PATH_AUTHOR_GET,
    {
      schema: {
        tags: ['author'],
        params: {
          authorName: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: {
                type: 'object',
                properties: {},
              },
            },
          },
        },
      },
    },
    async (req, res) => {
      const { authorName } = req.params;
      let author: string;
      try {
        author = await getAuthorName(authorName);

        return {
          code: 0,
          data: {
            author,
          },
          message: 'ok',
        };
      } catch (e: any) {
        res.status(500);
        return {
          code: 1,
          message: e.message,
        };
      }
    }
  );
};
