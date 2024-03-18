import { readFile } from 'node:fs/promises';
type Settings = {
  //
  [key: string]: string | number | boolean | object;
};

/**
 * Function to get settings from settings.json file
 * If settings.json file is not found, it will return default settings from settings.schema.json
 */
const getSettings = async () => {
  return await readFile('settings.json', 'utf8')
    .catch(async () => {
      return await readFile('settings.schema.json', 'utf8')
        .catch(() => {
          throw new Error('Settings file not found');
        })
        .then(schema => {
          const json = JSON.parse(schema);

          return Object.keys(json.properties).reduce((acc: Settings, key: string) => {
            acc[key] = json.properties[key].default;

            return acc;
          }, {});
        });
    })
    .then(settings => {
      if (typeof settings === 'string') {
        return JSON.parse(settings);
      }

      return settings;
    });
};

export default getSettings;
