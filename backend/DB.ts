import {Database} from 'ueberdb2';
import {settings} from './exportedVars';

export let db: Database|null= null;
export const initDatabase = async () => {
  db = new Database(settings.dbType, settings.dbSettings, null, console);
  await db.init();

  return db;
};


export const getDb = async () => {
  if (db == null) {
    console.log('init db')
    db = await initDatabase();
  }
  return db;
};
