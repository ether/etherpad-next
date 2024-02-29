import { SmartOpAssembler } from '@/service/pads/SmartOpAssembler';
import { StringAssembler } from '@/service/pads/StringAssembler';
import { Op } from '@/service/pads/Operation';
import { ChangeSet } from '@/service/pads/ChangeSet';
import { Attribute } from '@/types/Attribute';
import AttributePool from '@/service/pads/AttributePool';
import { AttributeMap } from '@/service/pads/AttributeMap';
import { opsFromText } from '@/utils/service/utilFuncs';

export class ChangeSetBuilder {
  assem=  new SmartOpAssembler();
  o = new Op();
  charBank = new StringAssembler();
  oldLen = 0;

  constructor(oldLen: number) {
    this.oldLen = oldLen;
  }

  /**
   * @param {number} N - Number of characters to keep.
   * @param {number} L - Number of newlines among the `N` characters. If positive, the last
   *     character must be a newline.
   * @param {(string|Attribute[])} attribs - Either [[key1,value1],[key2,value2],...] or '*0*1...'
   *     (no pool needed in latter case).
   * @param {?AttributePool} pool - Attribute pool, only required if `attribs` is a list of
   *     attribute key, value pairs.
   * @returns {Builder} this
   */
  keep= (N: number, L: number, attribs?: string|Attribute[], pool?: AttributePool): ChangeSetBuilder => {
    this.o.opcode = '=';
    this.o.attribs = typeof attribs === 'string'
      ? attribs : new AttributeMap(pool!).update(attribs || []).toString();
    this.o.chars = N;
    this.o.lines = (L || 0);
    this.assem.append(this.o);
    return this;
  };

  /**
   * @param {string} text - Text to keep.
   * @param {(string|Attribute[])} attribs - Either [[key1,value1],[key2,value2],...] or '*0*1...'
   *     (no pool needed in latter case).
   * @param {?AttributePool} pool - Attribute pool, only required if `attribs` is a list of
   *     attribute key, value pairs.
   * @returns {Builder} this
   */
  keepText = (text: string, attribs?: any, pool?: AttributePool): this => {
    for (const op of opsFromText('=', text, attribs, pool))this.assem.append(op);
    return this;
  };


  /**
   * @param {string} text - Text to insert.
   * @param {(string|Attribute[])} attribs - Either [[key1,value1],[key2,value2],...] or '*0*1...'
   *     (no pool needed in latter case).
   * @param {?AttributePool} pool - Attribute pool, only required if `attribs` is a list of
   *     attribute key, value pairs.
   * @returns {Builder} this
   */
  insert = (text: string, attribs: string, pool?: AttributePool): this => {
    for(const op of opsFromText('+', text, attribs, pool)) this.assem.append(op);
    this.charBank.append(text);
    return this;
  };

  /**
   * @param {number} N - Number of characters to remove.
   * @param {number} L - Number of newlines among the `N` characters. If positive, the last
   *     character must be a newline.
   * @returns {Builder} this
   */
  remove = (N: number, L?: number): this => {
    this.o.opcode = '-';
    this.o.attribs = '';
    this.o.chars = N;
    this.o.lines = (L || 0);
    this.assem.append(this.o);
    return this;
  };

  toString = () => {
    this.assem.endDocument();
    const newLen = this.oldLen + this.assem.getLengthChange();
    return ChangeSet.pack(this.oldLen, newLen, this.assem.toString(), this.charBank.toString());
  };
}
