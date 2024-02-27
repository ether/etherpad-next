'use strict';


import { MapArrayType } from '@/types/MapArrayType';

import { strict as assert } from 'assert';
import { Pad } from '@/service/pads/Pad';
import { beforeEach, beforeAll, it, describe, afterEach, afterAll } from 'vitest';
import settings from '@/backend/Setting';
import { randomString } from '@/tests/common';
import { padManagerInstance } from '@/service/pads/PadManager';
import { getAuthor4Token } from '@/service/pads/AuthorManager';
import { cleanText } from '@/utils/service/utilFuncs';
import { initDatabase } from '@/backend/DB';
import { EVENT_EMITTER } from '@/hooks/Hook';
import { PadDefaultLoaded } from '@/hooks/PadDefaultLoaded';

describe(__filename, function () {
  const backups:MapArrayType<any> = {};
  let pad: Pad|null;
  let padId: string;

  beforeAll(async function () {
    backups.defaultPadText = settings.defaultPadText;
    initDatabase();
  });

  beforeEach(async function () {
    padId = randomString();
    assert(!(await padManagerInstance.doesPadExist(padId)));
  });

  afterEach(async function () {
    if (pad != null) await pad.remove();
    pad = null;
  });

  describe('cleanText', async () =>{
    const testCases = [
      ['', ''],
      ['\n', '\n'],
      ['x', 'x'],
      ['x\n', 'x\n'],
      ['x\ny\n', 'x\ny\n'],
      ['x\ry\n', 'x\ny\n'],
      ['x\r\ny\n', 'x\ny\n'],
      ['x\r\r\ny\n', 'x\n\ny\n'],
    ];
    for (const [input, want] of testCases) {
      it(`${JSON.stringify(input)} -> ${JSON.stringify(want)}`, async ()=> {
        assert.equal(cleanText(input), want);
      });
    }
  });

  describe('padDefaultContent hook', async ()=> {
    it('runs when a pad is created without specific text', async function () {
      pad = await padManagerInstance.getPad(padId);
    });

    it('not run if pad is created with specific text', async function () {
      pad = await padManagerInstance.getPad(padId, '');
    });

    it('defaults to settings.defaultPadText', async ()=> {
      pad = await padManagerInstance.getPad(padId);
    });

    it('passes the pad object', async function () {
      pad = await padManagerInstance.getPad(padId);
    });

    it('passes empty authorId if not provided', async function () {
      pad = await padManagerInstance.getPad(padId);
    });

    it('passes provided authorId', async function () {
      const want = await getAuthor4Token(`t.${padId}`);
      pad = await padManagerInstance.getPad(padId, null, want);
    });

    it('uses provided content', async function () {
      const want = 'hello world';
      const gotP = new Promise<string>((resolve) => {
        EVENT_EMITTER.on('padLoad', (ctx: Pad) => {
          console.log("Result is",ctx);
          assert.equal(ctx.headRevisionNumber, 0);
          assert.equal(ctx.text(), `${want}\n`);
          resolve(ctx.text());
        });
      });
      assert.notEqual(want, settings.defaultPadText);
      pad = await padManagerInstance.getPad(padId, want);
      assert.equal(await gotP, `${want}\n`);
    });

    it('cleans provided content', async function () {
      const input = 'foo\r\nbar\r\tbaz';
      const want = 'foo\nbar\n        baz';
      assert.notEqual(want, settings.defaultPadText);
      const gotP = new Promise<PadDefaultLoaded>((resolve, reject)=>{
        EVENT_EMITTER.on('padDefaultContent', (ctx: PadDefaultLoaded) => {
          ctx.type = 'text';
          ctx.content = input;
          resolve(ctx);
        });
      });
      pad = await padManagerInstance.getPad(padId);
      assert.equal((await gotP).content, `${want}\n`);
    });
  });
});
