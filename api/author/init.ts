import { fastifyServer } from '@/server';
import {
  createAuthor,
  createAuthorIfNotExistsFor, getAuthorName, listPadsOfAuthor,
} from '@/service/pads/AuthorManager';

const AUTHOR_PATH = '/api/authors';

export const initAuthor = () => {
  fastifyServer.post<{
    Body: {
      authorName: string;
      authorMapper?: string;
      ifNotExists?: boolean;
    }
  }>(AUTHOR_PATH, {
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
  }, async (req, res) => {
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
  });

  fastifyServer.get<{
    Querystring: {
      authorName?: string;
    }
  }>(AUTHOR_PATH + '/pads', {
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
  }, async (req, res) => {
    const { authorName } = req.query;

    try {
      const author = await listPadsOfAuthor(authorName!);
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
  });

  fastifyServer.get<{
    Params: {
      authorName: string;
    }
  }>(AUTHOR_PATH+"/:authorName",{
    schema: {
      tags: ['author'],
      params: {
        authorName: { type: 'string' }
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
    }
  }, async (req, res) => {
    const {authorName} = req.params;
    let author: string;
    try {
       author = await getAuthorName(authorName);

      return {
        code: 0,
        data: {
          author,
        },
        message: 'ok'
      };
    }
    catch (e:any) {
      res.status(500);
      return {
        code: 1,
        message: e.message
      };
    }
  });
};
