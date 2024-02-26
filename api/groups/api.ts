import { fastifyServer } from '@/server';
import { createGroup, listAllGroups, createGroupIfNotExistsFor } from '@/service/pads/GroupManager';


export const init = ()=> {

  fastifyServer.post<{
    Querystring: {
      ifNotExists?: boolean;
      appGroupId?: string;
    }
  }>('/api/groups', async (req, res) => {
    let groupId;

    const  {ifNotExists, appGroupId} = req.query;

    if (ifNotExists) {
      if (!appGroupId) {
        return {
          code: 1,
          message: 'appGroupId is required'
        };
      }

      groupId = await createGroupIfNotExistsFor(appGroupId!);
    } else{
      groupId = await createGroup();
    }

    return {
      code: 0,
      data: {
        groupId
      },
      message: 'ok'
    };
  });


  fastifyServer.get('/api/groups', async (req, res) => {
    const groupId = await listAllGroups();

    return {
      code: 0,
      data: {
        groupId
      },
      message: 'ok'
    };
  });
};
