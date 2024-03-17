import { readFile } from 'node:fs/promises';

const getSettings = async () => {
  const data = await readFile('settings.json', 'utf8')
    .catch(async () => {
      return await readFile('settings.schema.json', 'utf8')
        .catch(() => {
          throw new Error('Settings file not found');
        })
        .then(schema => schema);
    })
    .then(settings => settings);

  return JSON.parse(data);
};

export default getSettings;
