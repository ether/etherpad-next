// ensure we have an apikey
import { makeAbsolute } from '@/utils/backend/AbsolutePaths';
import { argvP } from '@/utils/backend/CLI';
import fs from 'fs';
import { randomString } from '@/utils/service/utilFuncs';

let apikey: string | null = null;

export const getAPIKey = () => {
  const apikeyFilename = makeAbsolute(argvP.apikey || './APIKEY.txt');

  if (!apikey) {
    try {
      apikey = fs.readFileSync(apikeyFilename, 'utf8');
      console.log(`Api key file read from: "${apikeyFilename}"`);
    } catch (e) {
      console.log(
        `Api key file "${apikeyFilename}" not found.  Creating with random contents.`
      );
      apikey = randomString(32);
      fs.writeFileSync(apikeyFilename, apikey!, 'utf8');
    }
  }
  return apikey;
};
