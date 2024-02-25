/**
 * A custom-made StringBuffer
 */
export class StringAssembler {
  private str: string;
  constructor() {
    this.str = '';
  }

  clear() { this.str = ''; }
  append = (s: string) => {
    this.str += String(s);
  };
  toString = () => this.str;
}
