import { fastifyServer } from '@/server';
import checkValidRev from '@/utils/checkValidRev';
import CustomError from '@/utils/service/CustomError';
import { getPadSafe } from '@/api/pads/init';
import { getTXTFromAtext } from '@/service/export/ExportTxt';

const BASE_PATH = '/api/pad/content/text';
export const initContent = () => {
  fastifyServer.get(BASE_PATH, {}, async (req, res) => {});
};

const getText = async (padID: string, rev: number) => {
  // try to parse the revision number
  if (rev !== undefined) {
    rev = checkValidRev(rev);
  }

  // get the pad
  const pad = await getPadSafe(padID, true);
  const head = pad.headRevisionNumber;

  // the client asked for a special revision
  if (rev !== undefined) {
    // check if this is a valid revision
    if (rev > head) {
      throw new CustomError(
        'rev is higher than the head revision of the pad',
        'apierror'
      );
    }

    // get the text of this revision
    // getInternalRevisionAText() returns an atext object, but we only want the .text inside it.
    // Details at https://github.com/ether/etherpad-lite/issues/5073
    const { text } = await pad.getInternalRevisionAText(rev);
    return { text };
  }

  // the client wants the latest text, lets return it to him
  const text = getTXTFromAtext(pad, pad.atext);
  return { text };
};
