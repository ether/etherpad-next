import { AttributePool } from '@/service/pads/AttributePool';
import { Attribute } from 'postcss-selector-parser';
import { AttributeMap } from '@/service/pads/AttributeMap';
import { SmartOpAssembler } from '@/service/pads/SmartOpAssembler';
import { Op } from '@/service/pads/Operation';
import { AText } from '@/types/PadType';

export const assert = (b: boolean, msg: string) => {
  if (!b) error(`Failed assertion: ${msg}`);
};



/**
 * This method is called whenever there is an error in the sync process.
 *
 * @param {string} msg - Just some message
 */
export const error = (msg:string) => {
  const e = new Error(msg);
  // @ts-ignore
  e.easysync = true;
  throw e;
};

/**
 * Parses a number from string base 36.
 *
 * @param {string} str - string of the number in base 36
 * @returns {number} number
 */
export const parseNum = (str: string): number => parseInt(str, 36);

/**
 * Copies op1 to op2
 *
 * @param {Op} op1 - src Op
 * @param {Op} [op2] - dest Op. If not given, a new Op is used.
 * @returns {Op} `op2`
 */
export const copyOp= (op1: Op, op2: Op = new Op()): Op => Object.assign(op2, op1);


/**
 * Cleans an Op object.
 *
 * @param {Op} op - object to clear
 */
export const clearOp = (op: Op) => {
  op.opcode = '';
  op.chars = 0;
  op.lines = 0;
  op.attribs = '';
};

/**
 * Generates operations from the given text and attributes.
 *
 * @param {('-'|'+'|'=')} opcode - The operator to use.
 * @param {string} text - The text to remove/add/keep.
 * @param {(Iterable<Attribute>|AttributeString)} [attribs] - The attributes to insert into the pool
 *     (if necessary) and encode. If an attribute string, no checking is performed to ensure that
 *     the attributes exist in the pool, are in the canonical order, and contain no duplicate keys.
 *     If this is an iterable of attributes, `pool` must be non-null.
 * @param {?AttributePool} pool - Attribute pool. Required if `attribs` is an iterable of
 *     attributes, ignored if `attribs` is an attribute string.
 * @yields {Op} One or two ops (depending on the presense of newlines) that cover the given text.
 * @returns {Generator<Op>}
 */
export const opsFromText=  function* (opcode: '' | '=' | '+' | '-', text:string,
                         attribs:Attribute[]|string = '', pool: AttributePool|null = null) {
  const op = new Op(opcode);
  op.attribs = typeof attribs === 'string'
    ? attribs : new AttributeMap(pool!).update(attribs || [], opcode === '+').toString();
  const lastNewlinePos = text.lastIndexOf('\n');
  if (lastNewlinePos < 0) {
    op.chars = text.length;
    op.lines = 0;
    yield op;
  } else {
    op.chars = lastNewlinePos + 1;
    op.lines = text.match(/\n/g)!.length;
    yield op;
    const op2 = copyOp(op);
    op2.chars = text.length - (lastNewlinePos + 1);
    op2.lines = 0;
    yield op2;
  }
};


export const  makeSplice = (orig: string, start: number, ndel: number, ins: string, attribs?: string, pool?: AttributePool) => {
  if (start < 0) throw new RangeError(`start index must be non-negative (is ${start})`);
  if (ndel < 0) throw new RangeError(`characters to delete must be non-negative (is ${ndel})`);
  if (start > orig.length) start = orig.length;
  if (ndel > orig.length - start) ndel = orig.length - start;
  const deleted = orig.substring(start, start + ndel);
  const assem = new SmartOpAssembler();
  const ops = (function* () {
    yield* opsFromText('=', orig.substring(0, start));
    yield* opsFromText('-', deleted);
    yield* opsFromText('+', ins, attribs, pool);
  })();
  for (const op of ops) assem.append(op);
  assem.endDocument();
  return exports.pack(orig.length, orig.length + ins.length - ndel, assem.toString(), ins);
};


/**
 * Generates a random String with the given length. Is needed to generate the Author, Group,
 * readonly, session Ids
 */
export const randomString = (len: number) => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let randomstring = '';
  len = len || 20;
  for (let i = 0; i < len; i++) {
    const rnum = Math.floor(Math.random() * chars.length);
    randomstring += chars.substring(rnum, rnum + 1);
  }
  return randomstring;
};


export const cleanText = (txt:string): string => txt.replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/\t/g, '        ')
  .replace(/\xa0/g, ' ');

/**
 * checks if a number is an int
 * @param {number|string} value
 * @return {boolean} If the value is an integer
 */
// @ts-ignore
export const isInt = (value:number|string): boolean => (parseFloat(value) === parseInt(value)) && !isNaN(value);


export const opsFromAText = function* (atext: AText) {
  // intentionally skips last newline char of atext
  let lastOp = null;
  for (const op of exports.deserializeOps(atext.attribs)) {
    if (lastOp != null) yield lastOp;
    lastOp = op;
  }
  if (lastOp == null) return;
  // exclude final newline
  if (lastOp.lines <= 1) {
    lastOp.lines = 0;
    lastOp.chars--;
  } else {
    const nextToLastNewlineEnd = atext.text.lastIndexOf('\n', atext.text.length - 2) + 1;
    const lastLineLength = atext.text.length - nextToLastNewlineEnd - 1;
    lastOp.lines--;
    lastOp.chars -= (lastLineLength + 1);
    yield copyOp(lastOp);
    lastOp.lines = 0;
    lastOp.chars = lastLineLength;
  }
  if (lastOp.chars) yield lastOp;
};
