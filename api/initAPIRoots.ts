import { initGroups } from './groups/api';
import { initPads } from '@/api/pads/init';
import { initAuthor } from '@/api/author/init';

export const initAPIRoots = () => {
  initGroups();
  initPads();
  initAuthor();
};
