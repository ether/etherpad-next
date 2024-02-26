import {init} from './groups/api';
import { makeAbsolute } from '@/utils/backend/AbsolutePaths';
import fs from 'fs';
import { randomString } from '@/utils/service/utilFuncs';
import { argvP } from '@/utils/backend/CLI';
import { fastifyServer } from '@/server';

export const initAPIRoots = () => {


  init();

};
