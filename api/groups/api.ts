import { fastifyServer } from '@/server';
import {
  createGroup,
  listAllGroups,
  createGroupIfNotExistsFor,
  deleteGroup,
} from '@/service/pads/GroupManager';
import { EVENT_EMITTER } from '@/hooks/Hook';
import { initAuthor } from '@/api/author/init';

const basePath = '/api/groups';


EVENT_EMITTER.on('fastifyServerReady', async () => {
  initGroups();
});

export const initGroups = () => {
  fastifyServer.post<{
    Querystring: {
      ifNotExists?: boolean;
      appGroupId?: string;
    };
  }>(
    basePath,
    {
      schema: {
        tags: ['group'],
        querystring: {
          ifNotExists: { type: 'boolean' },
          appGroupId: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: {
                type: 'object',
                properties: {
                  groupId: { type: 'string' },
                },
              },
              message: { type: 'string' },
            },
          },
        },
        security: [
          {
            apiKey: [],
          },
        ],
      },
    },
    async (req, res) => {
      let groupId;

      const { ifNotExists, appGroupId } = req.query;

      if (ifNotExists) {
        if (!appGroupId) {
          return {
            code: 1,
            message: 'appGroupId is required',
          };
        }

        groupId = await createGroupIfNotExistsFor(appGroupId!);
      } else {
        groupId = await createGroup();
      }

      return {
        code: 0,
        data: {
          groupId,
        },
        message: 'ok',
      };
    }
  );

  fastifyServer.get(
    basePath,
    {
      schema: {
        tags: ['group'],
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              data: {
                type: 'object',
                properties: {
                  groupId: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                },
              },
              message: { type: 'string' },
            },
          },
        },
        security: [
          {
            apiKey: [],
          },
        ],
      },
    },
    async () => {
      const { groupIDs } = await listAllGroups();

      return {
        code: 0,
        data: {
          groupId: groupIDs,
        },
        message: 'ok',
      };
    }
  );

  fastifyServer.delete<{
    Params: {
      groupId: string;
    };
  }>(
    `${basePath}/:groupId`,
    {
      schema: {
        tags: ['group'],
        params: {
          groupId: { type: 'string' },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              code: { type: 'number' },
              message: { type: 'string' },
            },
          },
          409: {
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
      const groupId = req.params.groupId;

      try {
        await deleteGroup(groupId);
        return {
          code: 0,
          message: 'ok',
        };
      } catch (e: any) {
        res.statusCode = 409;
        return {
          code: 1,
          message: e.message,
        };
      }
    }
  );
};
