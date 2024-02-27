import { EventEmitter2 } from 'eventemitter2';
import { MapArrayType } from '@/types/MapArrayType';
export const EVENT_EMITTER = new EventEmitter2();

class PluginHooks {
  private hookStorage: MapArrayType<Function[]> = {};
  public registerHook = (hookName: string, callback: Function) => {
    console.log('Registering hook' + hookName + ' with callback' + callback);
    if (this.hookStorage[hookName] == null) {
      this.hookStorage[hookName] = [callback];
    } else {
      this.hookStorage[hookName].push(callback);
    }
  };

  public callHook = (hookName: string, ...args: any) => {
    if (this.hookStorage[hookName] != null) {
      for (const callback of this.hookStorage[hookName]) {
        console.log('Result is', callback);
        callback(...args);
      }
    }
  };

  public clearHooks = () => {
    this.hookStorage = {};
  };

  public clearHook = (hookName: string) => {
    this.hookStorage[hookName] = [];
  };
}

export const PLUGIN_HOOKS_INSTANCE = new PluginHooks();
