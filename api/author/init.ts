import { fastifyServer } from '@/server';
import {
  createAuthor,
  createAuthorIfNotExistsFor, listPadsOfAuthor,
} from '@/service/pads/AuthorManager';

const AUTHOR_PATH = '/api/authors';

export const initAuthor = ()=>{
  fastifyServer.post<{
    Body: {
      authorName: string;
      authorMapper?: string;
      ifNotExists?: boolean;
    }
  }>(AUTHOR_PATH, async (req, res) => {
    const { authorName,authorMapper,ifNotExists } = req.body;
    try {
      let author;

      if (ifNotExists) {
        author = await createAuthorIfNotExistsFor(authorMapper!,authorName);
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
  }>(AUTHOR_PATH+"/pads", async (req, res) => {
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
};
