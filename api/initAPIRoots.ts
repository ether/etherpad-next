import { initGroups } from './groups/api';
import { initPads } from '@/api/pads/init';
import { initAuthor } from '@/api/author/init';
import { initSession } from '@/api/session/initSession';

export const initAPIRoots = () => {
  initGroups();
  initPads();
  initAuthor();
  initSession();
};
