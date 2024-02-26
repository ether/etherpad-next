import { fastifyServer } from '@/server';
import { padManagerInstance } from '@/service/pads/PadManager';
import CustomError from '@/utils/service/CustomError';
import { createGroupPad } from '@/service/pads/GroupManager';


const BASE_PATH = '/api/pads';
const GROUP_PAD_PREFIX = '/api/groupPads';
export const initPads = () => {
  fastifyServer.get(BASE_PATH, async (req,
                                      res) => {
    const pads = await padManagerInstance.listAllPads();

    return {
      code: 0,
      data: {
        pads: pads,
      },
      message: 'ok',
    };
  });

  fastifyServer.post<{
    Body: {
      groupID: string;
      padName: string;
      text: string;
      authorId?: string;
    }
  }>(`${GROUP_PAD_PREFIX}`, async (req, res) => {
    const { groupID, padName, text, authorId } = req.body;
    try {
      const pad = await createGroupPad(groupID, padName, text, authorId);
      return {
        code: 0,
        data: {
          pad,
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
      padID: string;
    }
  }>(`${BASE_PATH}/:padID`, async (req,
                                   res) => {
    const padID = req.params.padID;
    try {
      const pad = await padManagerInstance.getPad(padID);
      return {
        code: 0,
        data: {
          pad: pad,
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


  fastifyServer.post<{
    Body: {
      padID: string;
      text: string;
      authorId?: string;
    }
  }>(BASE_PATH, async (req, res) => {

    const { padID, text, authorId } = req.body;
    if (padID) {
      // ensure there is no $ in the padID
      if (padID.indexOf('$') !== -1) {
        throw new CustomError('createPad can\'t create group pads', 'apierror');
      }

      // check for url special characters
      if (padID.match(/(\/|\?|&|#)/)) {
        throw new CustomError('malformed padID: Remove special characters', 'apierror');
      }
    }

    // create pad
    await getPadSafe(padID, false, text, authorId);
  });
};


// gets a pad safe
const getPadSafe = async (padID: string | object, shouldExist: boolean, text?: string, authorId: string = '') => {
  // check if padID is a string
  if (typeof padID !== 'string') {
    throw new CustomError('padID is not a string', 'apierror');
  }

  // check if the padID maches the requirements
  if (!padManagerInstance.isValidPadId(padID)) {
    throw new CustomError('padID did not match requirements', 'apierror');
  }

  // check if the pad exists
  const exists = await padManagerInstance.doesPadExist(padID);

  if (!exists && shouldExist) {
    // does not exist, but should
    throw new CustomError('padID does not exist', 'apierror');
  }

  if (exists && !shouldExist) {
    // does exist, but shouldn't
    throw new CustomError('padID does already exist', 'apierror');
  }

  // pad exists, let's get it
  return padManagerInstance.getPad(padID, text, authorId);
};
