const alphabet = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Generates a random string.
 *
 * @param {number} [len] - The desired length of the generated string.
 * @param {string} [charset] - Characters to pick from.
 * @returns {string}
 */
export const randomString = (len: number = 10, charset: string = `${alphabet}${alphabet.toUpperCase()}0123456789`): string => {
  let ret = '';
  while (ret.length < len) ret += charset[Math.floor(Math.random() * charset.length)];
  return ret;
};
