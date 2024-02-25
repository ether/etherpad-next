import path from 'node:path';

let etherpadRoot: string | null = null;

export const findEtherpadRoot = () => {
  if (etherpadRoot != null) {
    return etherpadRoot;
  }

  return process.cwd();
};

export const makeAbsolute = (somePath: string) => {
  if (path.isAbsolute(somePath)) {
    return somePath;
  }

  const rewrittenPath = path.join(findEtherpadRoot(), somePath);

  console.debug(
    `Relative path "${somePath}" can be rewritten to "${rewrittenPath}"`
  );
  return rewrittenPath;
};

export const isSubdir = (parent: string, arbitraryDir: string): boolean => {
  const relative = path.relative(parent, arbitraryDir);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
};
