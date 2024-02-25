import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { getAcronymFromString } from '@/utils/strings';

describe('getAcronymFromString', () => {
  it('returns the correct acronym for a string', () => {
    const inputString = 'example string with acronyms';
    const expectedAcronym = 'ESWA';

    const result = getAcronymFromString(inputString);

    assert.equal(result, expectedAcronym);
  });

  it('handles empty string', () => {
    const inputString = '';
    const expectedAcronym = '';

    const result = getAcronymFromString(inputString);

    assert.equal(result, expectedAcronym);
  });

  it('handles string with no acronyms', () => {
    const inputString = 'no acronyms here';
    const expectedAcronym = 'NAH';

    const result = getAcronymFromString(inputString);

    assert.equal(result, expectedAcronym);
  });

  it('getAcronymFromString - handles string with special characters', () => {
    const inputString = '!@#$%^&*()';
    const expectedAcronym = '';

    const result = getAcronymFromString(inputString);

    assert.equal(result, expectedAcronym);
  });
});
