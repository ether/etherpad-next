import path from 'path';

let etherpadRoot: string | null = null;
import findRoot from 'find-root';
import log4js from 'log4js';
const absPathLogger = log4js.getLogger('AbsolutePaths');

export const findEtherpadRoot = () => {
  if (etherpadRoot != null) {
    return etherpadRoot;
  }

  const foundRoot = findRoot(__dirname);

  return foundRoot;
};

export const makeAbsolute = (somePath: string) => {
  if (path.isAbsolute(somePath)) {
    return somePath;
  }

  const rewrittenPath = path.join(findEtherpadRoot(), somePath);

  absPathLogger.debug(
    `Relative path "${somePath}" can be rewritten to "${rewrittenPath}"`
  );
  return rewrittenPath;
};

export const isSubdir = (parent: string, arbitraryDir: string): boolean => {
  const relative = path.relative(parent, arbitraryDir);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};
