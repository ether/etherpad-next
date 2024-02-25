import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import minify from '@/utils/backend/minify';

describe('minify', () => {
  it('removes multiline comments', () => {
    const inputJson = `
    {
      "key": "value",
      /*
        This is a multiline comment
        that should be removed.
      */
      "anotherKey": 42
    }
  `;

    const expectedOutput = '{"key":"value","anotherKey":42}  ';

    const result = minify(inputJson);

    assert.equal(result, expectedOutput);
  });

  it('removes single line comments', () => {
    const inputJson = `
    {
      "key": "value",
      // This is a single line comment
      "anotherKey": 42
    }
  `;

    const expectedOutput = '{"key":"value","anotherKey":42}  ';

    const result = minify(inputJson);

    assert.equal(result, expectedOutput);
  });

  it('removes comments within strings', () => {
    const inputJson = `
    {
      "key": "value /* not a comment */",
      // This is a single line comment
      "anotherKey": "string // with a comment"
    }
  `;

    const expectedOutput =
      '{"key":"value /* not a comment */","anotherKey":"string // with a comment"}  ';

    const result = minify(inputJson);

    assert.equal(result, expectedOutput);
  });

  it('handles empty input', () => {
    const inputJson = '';

    const result = minify(inputJson);

    assert.equal(result, '');
  });

  it('handles input with no comments', () => {
    const inputJson = '{"key":"value","anotherKey": 42 }';

    const result = minify(inputJson);

    assert.equal(result, inputJson);
  });
});
