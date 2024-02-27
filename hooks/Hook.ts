import {EventEmitter2} from 'eventemitter2';
import { MapArrayType } from '@/types/MapArrayType';
export const EVENT_EMITTER = new EventEmitter2();

class PluginHooks {
  private hookStorage: MapArrayType<Function[]> = {};
  public registerHook = (hookName: string, callback: Function) => {
    if (this.hookStorage[hookName] == null)
    {
      this.hookStorage[hookName] = [];
      this.hookStorage[hookName].push(callback);
    } else {
      this.hookStorage[hookName].push(callback);
    }
  };

  public callHook = (hookName: string, ...args: any) => {
    if (this.hookStorage[hookName] != null) {
      for (const callback of this.hookStorage[hookName]) {
        callback(...args);
      }
    }
  };
}

export const PLUGIN_HOOKS_INSTANCE = new PluginHooks();
