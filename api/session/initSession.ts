import { fastifyServer } from '@/server';
import {
  createSession,
  deleteSession,
  listSessionsOfAuthor,
  getSessionInfo,
  listSessionsOfGroup,
} from '@/service/pads/SessionManager';

export const initSession = () => {
  fastifyServer.post<{
    Body: {
      groupId: string;
      authorId: string;
      validUntil: number;
    };
  }>(
    '/api/session',
    {
      schema: {
        tags: ['session'],
        body: {
          type: 'object',
          properties: {
            groupId: { type: 'string' },
            authorId: { type: 'string' },
            validUntil: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string' },
                },
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
      try {
        const { sessionID } = await createSession(
          req.body.groupId,
          req.body.authorId,
          req.body.validUntil
        );

        return {
          code: 0,
          data: {
            sessionId: sessionID,
          },
        };
      } catch (e: any) {
        res.statusCode = 500;
        return {
          code: 1,
          message: e.message,
        };
      }
    }
  );

  fastifyServer.delete<{
    Params: {
      sessionId: string;
    };
  }>(
    '/api/session/:sessionId',
    {
      schema: {
        tags: ['session'],
        params: {
          sessionId: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              message: { type: 'string' },
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
      try {
        await deleteSession(req.params.sessionId);
        return {
          code: 0,
          message: 'ok',
        };
      } catch (e: any) {
        res.statusCode = 500;
        return {
          code: 1,
          message: e.message,
        };
      }
    }
  );

  fastifyServer.get<{
    Params: {
      sessionId: string;
    };
  }>(
    '/api/session/:sessionId',
    {
      schema: {
        tags: ['session'],
        params: {
          sessionId: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: {
                type: 'object',
                properties: {
                  groupID: { type: 'string' },
                  authorID: { type: 'string' },
                  validUntil: { type: 'number' },
                },
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
      try {
        const session = await getSessionInfo(req.params.sessionId);
        return {
          code: 0,
          data: session,
        };
      } catch (e: any) {
        res.statusCode = 500;
        return {
          code: 1,
          message: e.message,
        };
      }
    }
  );

  fastifyServer.get<{
    Params: {
      groupId: string;
    };
  }>(
    '/api/session/:groupId/groups',
    {
      schema: {
        tags: ['session'],
        params: {
          sessionId: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: {
                type: 'array',
                properties: {
                  groupID: { type: 'string' },
                  authorID: { type: 'string' },
                  validUntil: { type: 'number' },
                },
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
      try {
        const session = await listSessionsOfGroup(req.params.groupId);
        return {
          code: 0,
          data: session,
        };
      } catch (e: any) {
        res.statusCode = 500;
        return {
          code: 1,
          message: e.message,
        };
      }
    }
  );

  fastifyServer.get<{
    Params: {
      authorId: string;
    };
  }>(
    '/api/session/:authorId/author',
    {
      schema: {
        tags: ['session'],
        params: {
          sessionId: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: {
                type: 'array',
                properties: {
                  groupID: { type: 'string' },
                  authorID: { type: 'string' },
                  validUntil: { type: 'number' },
                },
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
      try {
        const session = await listSessionsOfAuthor(req.params.authorId);
        return {
          code: 0,
          data: session,
        };
      } catch (e: any) {
        res.statusCode = 500;
        return {
          code: 1,
          message: e.message,
        };
      }
    }
  );
};
