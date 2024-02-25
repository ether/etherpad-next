import { assert } from '@/utils/service/utilFuncs';

export class StringIterator {
  private curIndex: number;
  private newLines: number;
  private str: string;
  constructor(stringToIterate: string) {
    this.curIndex = 0;
    this.newLines  = stringToIterate.split('\n').length - 1;
    this.str = stringToIterate;
  }

  remaining = () => this.str.length - this.curIndex;

  get newlines() {
    return this.newLines;
  }

  take = (n:number) => {
    this.assertRemaining(n);
    const s = this.str.substr(this.curIndex, n);
    this.newLines -= s.split('\n').length - 1;
    this.curIndex += n;
    return s;
  };

  peek= (n: number) => {
    this.assertRemaining(n);
    return this.str.substr(this.curIndex, n);
  };

  skip = (n: number) => {
    this.assertRemaining(n);
    this.curIndex += n;
  };
  assertRemaining(n: number) {
    assert(n <= this.remaining(), `!(${n} <= ${this.remaining()})`);
  }
}
