import { assert } from '@/utils/service/utilFuncs';
import { Op } from '@/service/pads/Operation';

export class OpAssembler {
  private serialized: string;

  constructor() {
    this.serialized = '';
  }

  append = (op: Op | object) => {
    assert(op instanceof Op, 'argument must be an instance of Op');
    this.serialized += op.toString();
  };

  toString = () => this.serialized;

  clear = () => {
    this.serialized = '';
  };
}
