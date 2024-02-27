import { Database } from 'ueberdb2';
import { SettingsObj } from '@/types/SettingsObject';

export let db: Database | null = null;
export const initDatabase = async (settingsLoaded: SettingsObj) => {
  db = new Database(settingsLoaded.dbType, settingsLoaded.dbSettings, null, console);
  await db.init();

  return db;
};
