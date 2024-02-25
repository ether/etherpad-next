import {Database} from 'ueberdb2';
import {settings} from './Setting';
export let db: Database|null= null;
export const initDatabase = async () => {
  db = new Database(settings.dbType, settings.dbSettings, null, console);
  await db.init();

  return db;
};
