import { fastifyServer } from '@/server';
import { createGroup } from '@/service/pads/GroupManager';


export const init = ()=> {

  fastifyServer.post('/api/groups', async (req, res) => {
    const groupId = await createGroup();

    return {
      code: 0,
      data: {
        groupId
      },
      message: 'ok'
    };
  });

};
