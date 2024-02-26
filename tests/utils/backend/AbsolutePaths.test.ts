import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  findEtherpadRoot,
  makeAbsolute,
  isSubdir,
} from '@/utils/backend/AbsolutePaths';

describe('AbsolutePaths', () => {
  it('findEtherpadRoot - returns current working directory if etherpadRoot is not set', () => {
    const originalCwd = process.cwd();
    const result = findEtherpadRoot();
    assert.equal(result, originalCwd);
  });

  it('makeAbsolute - returns absolute path if already absolute', () => {
    const absolutePath = '/some/absolute/path';
    const result = makeAbsolute(absolutePath);
    assert.equal(result, absolutePath);
  });

  it('isSubdir - returns true for a subdirectory', () => {
    const parent = '/parent/directory';
    const subdirectory = '/parent/directory/subdir';
    const result = isSubdir(parent, subdirectory);
    assert.strictEqual(result, true);
  });

  it('isSubdir - returns false for a directory outside parent', () => {
    const parent = '/parent/directory';
    const outsideDirectory = '/outside/directory';
    const result = isSubdir(parent, outsideDirectory);
    assert.strictEqual(result, false);
  });

  it('isSubdir - returns false for parent equal to arbitrary directory', () => {
    const directory = '/some/directory';
    const result = isSubdir(directory, directory);
    assert.strictEqual(result, false);
  });
});
