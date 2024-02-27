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
import { PLUGIN_HOOKS_INSTANCE } from '@/hooks/Hook';
import { PadDefaultLoaded } from '@/hooks/PadDefaultLoaded';
import { padDefaultContent } from '@/hooks/constants';

describe(__filename, function () {
  const backups:MapArrayType<any> = {};
  let pad: Pad|null;
  let padId: string;

  beforeAll(async function () {
    backups.defaultPadText = settings.defaultPadText;
    await initDatabase(settings);
  });

  beforeEach(async function () {
    PLUGIN_HOOKS_INSTANCE.clearHooks();
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
      const p = new Promise<void>( (resolve)=>{
        PLUGIN_HOOKS_INSTANCE.registerHook(padDefaultContent, (ctx: PadDefaultLoaded) => {
          resolve();
        });
      });
      pad = await padManagerInstance.getPad(padId);
      await p;
    });

    it('not run if pad is created with specific text', async function () {
      PLUGIN_HOOKS_INSTANCE.registerHook(padDefaultContent, (ctx: PadDefaultLoaded) => {
        assert.fail('hook ran');
      });
      pad = await padManagerInstance.getPad(padId, '');
    });

    it('passes the pad object', async function () {
      const want = await getAuthor4Token(`t.${padId}`);
      const gotP = new Promise((resolve) => {
        PLUGIN_HOOKS_INSTANCE.registerHook(padDefaultContent, async (ctx: PadDefaultLoaded) => {
          resolve(ctx.pad);
        });
      });
      pad = await padManagerInstance.getPad(padId, null, want);
      assert.equal(await gotP, pad);
    });

    it('passes empty authorId if not provided', async function () {
      const want = await getAuthor4Token(`t.${padId}`);
      const gotP = new Promise((resolve) => {
        PLUGIN_HOOKS_INSTANCE.registerHook(padDefaultContent, async (ctx: PadDefaultLoaded) => {
          resolve(ctx.authorId);
        });
      });
      pad = await padManagerInstance.getPad(padId, null, want);
      assert.equal(await gotP, want);
    });

    it('passes provided authorId', async function () {
      const want = await getAuthor4Token(`t.${padId}`);
      const gotP = new Promise((resolve) => {
        PLUGIN_HOOKS_INSTANCE.registerHook(padDefaultContent, async (ctx: PadDefaultLoaded) => {
          resolve(ctx.authorId);
        });
      });
      pad = await padManagerInstance.getPad(padId, null, want);
      assert.equal(await gotP, want);
    });

    it('uses provided content', async function () {
      const want = 'hello world';
      PLUGIN_HOOKS_INSTANCE.registerHook(padDefaultContent, async (ctx: PadDefaultLoaded)=>{
          ctx.type = 'text';
          ctx.content = want;
      });
      assert.notEqual(want, settings.defaultPadText);
      pad = await padManagerInstance.getPad(padId, want);
      assert.equal(pad.text(), `${want}\n`);
    });

    it('cleans provided content', async function () {
      const input = 'foo\r\nbar\r\tbaz';
      const want = 'foo\nbar\n        baz';
      assert.notEqual(want, settings.defaultPadText);
      PLUGIN_HOOKS_INSTANCE.registerHook(padDefaultContent, (ctx: PadDefaultLoaded)=>{
        ctx.type = 'text';
        ctx.content = input;
      });
      pad = await padManagerInstance.getPad(padId);
      assert.equal(pad.text(), `${want}\n`);
    });
  });
});
