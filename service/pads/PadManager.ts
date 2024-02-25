import { db } from '@/backend/DB';
import CustomError from '@/utils/service/CustomError';
import { Pad } from '@/service/pads/Pad';
import settings from '@/backend/Setting';

class GlobalPads {
  private loadedPads: Map<string, Pad>;

  constructor() {
    this.loadedPads = new Map();
  }
  get(name: string)
  {
    return this.loadedPads.get(`:${name}`);
  }
  set(name: string, value: any)
  {
    this.loadedPads.set(`:${name}`,value);
  }
  remove(name: string) {
    this.loadedPads.delete(`:${name}`);
  }
}


const globalPadCache = new GlobalPads();

export class PadManager {
  private _cachedList: string[] | null;
  private _list: Set<string>;
  private _loaded: Promise<void> | null;
  constructor() {
    this._cachedList = null;
    this._list = new Set();
    this._loaded = null;
  }

  /**
   * Returns all pads in alphabetical order as array.
   * @returns {Promise<string[]>} A promise that resolves to an array of pad IDs.
   */
  async getPads() {
    if (!this._loaded) {
      this._loaded = (async () => {
        const dbData = await db!.findKeys('pad:*', '*:*:*');
        if (dbData == null) return;
        for (const val of dbData) this.addPad(val.replace(/^pad:/, ''));
      })();
    }
    await this._loaded;
    if (!this._cachedList) this._cachedList = [...this._list].sort();
    return this._cachedList;
  }

  addPad(name: string) {
    if (this._list.has(name)) return;
    this._list.add(name);
    this._cachedList = null;
  }

  removePad(name: string) {
    if (!this._list.has(name)) return;
    this._list.delete(name);
    this._cachedList = null;
  }

  getPad = async (id: string, text?: string|null|object, authorId:string = '') => {
    // check if this is a valid padId
    if (!this.isValidPadId(id)) {
      throw new CustomError(`${id} is not a valid padId`, 'apierror');
    }

    // check if this is a valid text
    if (text != null) {
      // check if text is a string
      if (typeof text !== 'string') {
        throw new CustomError('text is not a string', 'apierror');
      }

      // check if text is less than 100k chars
      if (text.length > 100000) {
        throw new CustomError('text must be less than 100k chars', 'apierror');
      }
    }

    let pad = globalPadCache.get(id);

    // return pad if it's already loaded
    if (pad != null) {
      return pad;
    }

    // try to load pad
    pad = new Pad(id);

    // initialize the pad
    await pad!.init(text!, authorId);
    globalPadCache.set(id, pad);
    this.addPad(id);

    return pad;
  };

  /**
   * An array of padId transformations. These represent changes in pad name policy over
   * time, and allow us to "play back" these changes so legacy padIds can be found.
   */
  padIdTransforms = [
    [/\s+/g, '_'],
    [/:+/g, '_'],
  ];


  // returns a sanitized padId, respecting legacy pad id formats
  sanitizePadId = async (padId: string) => {
    for (let i = 0, n = this.padIdTransforms.length; i < n; ++i) {
      const exists = await exports.doesPadExist(padId);

      if (exists) {
        return padId;
      }

      const [from, to] = this.padIdTransforms[i];

      // @ts-ignore
      padId = padId.replace(from, to);
    }

    if (settings.lowerCasePadIds) padId = padId.toLowerCase();

    // we're out of possible transformations, so just return it
    return padId;
  };


  isValidPadId = (padId: string) => /^(g.[a-zA-Z0-9]{16}\$)?[^$]{1,50}$/.test(padId);

// removes a pad from the cache
  unloadPad = (padId: string) => {
    globalPadCache.remove(padId);
  };

  doesPadExist = async (padId: string) => {
    const value = await db!.get(`pad:${padId}`);
    return (value != null && value.atext);
  };
}


export const padManagerInstance = new PadManager();
