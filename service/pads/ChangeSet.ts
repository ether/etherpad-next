import {
  error,
  assert,
  parseNum,
  copyOp,
  opsFromText,
} from '@/utils/service/utilFuncs';
import { StringIterator } from '@/service/pads/StringIterator';
import { StringAssembler } from '@/service/pads/StringAssembler';
import { AChangeSet, APool, AText } from '@/types/PadType';
import { AttributePool } from '@/service/pads/AttributePool';
import { SmartOpAssembler } from '@/service/pads/SmartOpAssembler';
import { AttributeMap } from '@/service/pads/AttributeMap';
import { OpCode } from '@/types/OpCode';
import { Op } from '@/service/pads/Operation';
import { MergingOpAssembler } from '@/service/pads/MergingOpAssembler';

export class ChangeSet {
  static applyToAText = (cs: string, atext: AText, pool: AttributePool) => ({
    text: this.applyToText(cs, atext.text),
    attribs: this.applyToAttribution(cs, atext.attribs, pool),
  });

  /**
   * Applies a Changeset to the attribs string of a AText.
   *
   * @param {string} cs - Changeset
   * @param {string} astr - the attribs string of a AText
   * @param {AttributePool} pool - the attibutes pool
   * @returns {string}
   */
  static applyToAttribution = (
    cs: string,
    astr: string,
    pool: AttributePool
  ) => {
    const unpacked = this.unpack(cs);
    return this.applyZip(astr, unpacked.ops, (op1: Op, op2: Op) =>
      this.slicerZipperFunc(op1, op2, pool)
    );
  };

  /**
   * Composes two attribute strings (see below) into one.
   *
   * @param {AttributeString} att1 - first attribute string
   * @param {AttributeString} att2 - second attribue string
   * @param {boolean} resultIsMutation -
   * @param {AttributePool} pool - attribute pool
   * @returns {string}
   */
  static composeAttributes = (
    att1: string,
    att2: string,
    resultIsMutation: boolean,
    pool?: AttributePool
  ): string => {
    // att1 and att2 are strings like "*3*f*1c", asMutation is a boolean.
    // Sometimes attribute (key,value) pairs are treated as attribute presence
    // information, while other times they are treated as operations that
    // mutate a set of attributes, and this affects whether an empty value
    // is a deletion or a change.
    // Examples, of the form (att1Items, att2Items, resultIsMutation) -> result
    // ([], [(bold, )], true) -> [(bold, )]
    // ([], [(bold, )], false) -> []
    // ([], [(bold, true)], true) -> [(bold, true)]
    // ([], [(bold, true)], false) -> [(bold, true)]
    // ([(bold, true)], [(bold, )], true) -> [(bold, )]
    // ([(bold, true)], [(bold, )], false) -> []
    // pool can be null if att2 has no attributes.
    if (!att1 && resultIsMutation) {
      // In the case of a mutation (i.e. composing two exportss),
      // an att2 composed with an empy att1 is just att2.  If att1
      // is part of an attribution string, then att2 may remove
      // attributes that are already gone, so don't do this optimization.
      return att2;
    }
    if (!att2) return att1;
    return AttributeMap.fromString(att1, pool!)
      .updateFromString(att2, !resultIsMutation)
      .toString();
  };

  /**
   * Function used as parameter for applyZip to apply a Changeset to an attribute.
   *
   * @param {Op} attOp - The op from the sequence that is being operated on, either an attribution
   *     string or the earlier of two exports being composed.
   * @param {Op} csOp -
   * @param {AttributePool} pool - Can be null if definitely not needed.
   * @returns {Op} The result of applying `csOp` to `attOp`.
   */
  static slicerZipperFunc = (
    attOp: Op,
    csOp: Op,
    pool: AttributePool | null
  ): Op => {
    const opOut = new Op();
    if (!attOp.opcode) {
      copyOp(csOp, opOut);
      csOp.opcode = '';
    } else if (!csOp.opcode) {
      copyOp(attOp, opOut);
      attOp.opcode = '';
    } else if (attOp.opcode === '-') {
      copyOp(attOp, opOut);
      attOp.opcode = '';
    } else if (csOp.opcode === '+') {
      copyOp(csOp, opOut);
      csOp.opcode = '';
    } else {
      for (const op of [attOp, csOp]) {
        assert(
          op.chars >= op.lines,
          `op has more newlines than chars: ${op.toString()}`
        );
      }
      assert(
        attOp.chars < csOp.chars
          ? attOp.lines <= csOp.lines
          : attOp.chars > csOp.chars
            ? attOp.lines >= csOp.lines
            : attOp.lines === csOp.lines,
        'line count mismatch when composing changesets A*B; ' +
          `opA: ${attOp.toString()} opB: ${csOp.toString()}`
      );
      assert(
        ['+', '='].includes(attOp.opcode),
        `unexpected opcode in op: ${attOp.toString()}`
      );
      assert(
        ['-', '='].includes(csOp.opcode),
        `unexpected opcode in op: ${csOp.toString()}`
      );
      // @ts-ignore
      opOut.opcode = {
        '+': {
          '-': '', // The '-' cancels out (some of) the '+', leaving any remainder for the next call.
          '=': '+',
        },
        '=': {
          '-': '-',
          '=': '=',
        },
      }[attOp.opcode][csOp.opcode];
      const [fullyConsumedOp, partiallyConsumedOp] = [attOp, csOp].sort(
        (a, b) => a.chars - b.chars
      );
      opOut.chars = fullyConsumedOp.chars;
      opOut.lines = fullyConsumedOp.lines;
      opOut.attribs =
        csOp.opcode === '-'
          ? // csOp is a remove op and remove ops normally never have any attributes, so this should
            // normally be the empty string. However, padDiff.js adds attributes to remove ops and needs
            // them preserved so they are copied here.
            csOp.attribs
          : this.composeAttributes(
              attOp.attribs,
              csOp.attribs,
              attOp.opcode === '=',
              pool!
            );
      partiallyConsumedOp.chars -= fullyConsumedOp.chars;
      partiallyConsumedOp.lines -= fullyConsumedOp.lines;
      if (!partiallyConsumedOp.chars) partiallyConsumedOp.opcode = '';
      fullyConsumedOp.opcode = '';
    }
    return opOut;
  };

  pack = (oldLen: number, newLen: number, opsStr: string, bank: string) => {
    const lenDiff = newLen - oldLen;
    const lenDiffStr =
      lenDiff >= 0
        ? `>${exports.numToString(lenDiff)}`
        : `<${exports.numToString(-lenDiff)}`;
    const a = [];
    a.push('Z:', exports.numToString(oldLen), lenDiffStr, opsStr, '$', bank);
    return a.join('');
  };

  /**
   * Apply operations to other operations.
   *
   * @param {string} in1 - first Op string
   * @param {string} in2 - second Op string
   * @param {Function} func - Callback that applies an operation to another operation. Will be called
   *     multiple times depending on the number of operations in `in1` and `in2`. `func` has signature
   *     `opOut = f(op1, op2)`:
   *       - `op1` is the current operation from `in1`. `func` is expected to mutate `op1` to
   *         partially or fully consume it, and MUST set `op1.opcode` to the empty string once `op1`
   *         is fully consumed. If `op1` is not fully consumed, `func` will be called again with the
   *         same `op1` value. If `op1` is fully consumed, the next call to `func` will be given the
   *         next operation from `in1`. If there are no more operations in `in1`, `op1.opcode` will be
   *         the empty string.
   *       - `op2` is the current operation from `in2`, to apply to `op1`. Has the same consumption
   *         and advancement semantics as `op1`.
   *       - `opOut` is the result of applying `op2` (before consumption) to `op1` (before
   *         consumption). If there is no result (perhaps `op1` and `op2` cancelled each other out),
   *         either `opOut` must be nullish or `opOut.opcode` must be the empty string.
   * @returns {string} the integrated changeset
   */
  static applyZip = (in1: string, in2: string, func: Function) => {
    const ops1 = ChangeSet.deserializeOps(in1);
    const ops2 = ChangeSet.deserializeOps(in2);
    let next1 = ops1.next();
    let next2 = ops2.next();
    const assem = new SmartOpAssembler();
    while (!next1.done || !next2.done) {
      if (!next1.done && !next1.value.opcode) next1 = ops1.next();
      if (!next2.done && !next2.value.opcode) next2 = ops2.next();
      if (next1.value == null) next1.value = new Op();
      if (next2.value == null) next2.value = new Op();
      if (!next1.value.opcode && !next2.value.opcode) break;
      const opOut = func(next1.value, next2.value);
      if (opOut && opOut.opcode) assem.append(opOut);
    }
    assem.endDocument();
    return assem.toString();
  };

  /**
   * Writes a number in base 36 and puts it in a string.
   *
   * @param {number} num - number
   * @returns {string} string
   */
  static numToString = (num: number): string => num.toString(36).toLowerCase();

  /**
   * Creates an encoded changeset.
   *
   * @param {number} oldLen - The length of the document before applying the changeset.
   * @param {number} newLen - The length of the document after applying the changeset.
   * @param {string} opsStr - Encoded operations to apply to the document.
   * @param {string} bank - Characters for insert operations.
   * @returns {string} The encoded changeset.
   */
  static pack = (
    oldLen: number,
    newLen: number,
    opsStr: string,
    bank: string
  ) => {
    const lenDiff = newLen - oldLen;
    const lenDiffStr =
      lenDiff >= 0
        ? `>${this.numToString(lenDiff)}`
        : `<${this.numToString(-lenDiff)}`;
    const a = [];
    a.push('Z:', this.numToString(oldLen), lenDiffStr, opsStr, '$', bank);
    return a.join('');
  };

  static makeAText = (text: string, attribs?: any) => ({
    text,
    attribs: attribs || this.makeAttribution(text),
  });

  static makeAttribution = (text: string) => {
    const assem = new SmartOpAssembler();
    for (const op of opsFromText('+', text)) assem.append(op);
    return assem.toString();
  };

  /**
   * Applies a Changeset to a string.
   *
   * @param {string} cs - String encoded Changeset
   * @param {string} str - String to which a Changeset should be applied
   * @returns {string}
   */
  static applyToText = (cs: string, str: string): string => {
    const unpacked = this.unpack(cs);
    assert(
      str.length === unpacked.oldLen,
      `mismatched apply: ${str.length} / ${unpacked.oldLen}`
    );
    const bankIter = new StringIterator(unpacked.charBank);
    const strIter = new StringIterator(str);
    const assem = new StringAssembler();
    for (const op of this.deserializeOps(unpacked.ops)) {
      switch (op.opcode) {
        case '+':
          // op is + and op.lines 0: no newlines must be in op.chars
          // op is + and op.lines >0: op.chars must include op.lines newlines
          if (op.lines !== bankIter.peek(op.chars).split('\n').length - 1) {
            throw new Error(
              `newline count is wrong in op +; cs:${cs} and text:${str}`
            );
          }
          assem.append(bankIter.take(op.chars));
          break;
        case '-':
          // op is - and op.lines 0: no newlines must be in the deleted string
          // op is - and op.lines >0: op.lines newlines must be in the deleted string
          if (op.lines !== strIter.peek(op.chars).split('\n').length - 1) {
            throw new Error(
              `newline count is wrong in op -; cs:${cs} and text:${str}`
            );
          }
          strIter.skip(op.chars);
          break;
        case '=':
          // op is = and op.lines 0: no newlines must be in the copied string
          // op is = and op.lines >0: op.lines newlines must be in the copied string
          if (op.lines !== strIter.peek(op.chars).split('\n').length - 1) {
            throw new Error(
              `newline count is wrong in op =; cs:${cs} and text:${str}`
            );
          }
          assem.append(strIter.take(op.chars));
          break;
      }
    }
    assem.append(strIter.take(strIter.remaining()));
    return assem.toString();
  };

  static unpack = (cs: string) => {
    const headerRegex = /Z:([0-9a-z]+)([><])([0-9a-z]+)|/;
    const headerMatch = headerRegex.exec(cs);
    if (!headerMatch || !headerMatch[0]) error(`Not a changeset: ${cs}`);
    const oldLen = parseNum(headerMatch![1]);
    const changeSign = headerMatch![2] === '>' ? 1 : -1;
    const changeMag = parseNum(headerMatch![3]);
    const newLen = oldLen + changeSign * changeMag;
    const opsStart = headerMatch![0].length;
    let opsEnd = cs.indexOf('$');
    if (opsEnd < 0) opsEnd = cs.length;
    return {
      oldLen,
      newLen,
      ops: cs.substring(opsStart, opsEnd),
      charBank: cs.substring(opsEnd + 1),
    };
  };

  /**
   * Parses a string of serialized changeset operations.
   *
   * @param {string} ops - Serialized changeset operations.
   * @yields {Op}
   * @returns {Generator<Op>}
   */
  static deserializeOps = function* (ops: string) {
    // TODO: Migrate to String.prototype.matchAll() once there is enough browser support.
    const regex = /((?:\*[0-9a-z]+)*)(?:\|([0-9a-z]+))?([-+=])([0-9a-z]+)|(.)/g;
    let match;
    while ((match = regex.exec(ops)) != null) {
      if (match[5] === '$') return; // Start of the insert operation character bank.
      if (match[5] != null)
        error(`invalid operation: ${ops.slice(regex.lastIndex - 1)}`);
      const op = new Op(match[3] as '' | '=' | '+' | '-');
      op.lines = parseNum(match[2] || '0');
      op.chars = parseNum(match[4]);
      op.attribs = match[1];
      yield op;
    }
  };

  /**
   * Copies a AText structure from atext1 to atext2.
   *
   * @param {AText} atext1 -
   * @param {AText} atext2 -
   */
  static copyAText = (atext1: AText, atext2: AText) => {
    atext2.text = atext1.text;
    atext2.attribs = atext1.attribs;
  };

  static checkRep = (cs: string) => {
    const unpacked = this.unpack(cs);
    const oldLen = unpacked.oldLen;
    const newLen = unpacked.newLen;
    const ops = unpacked.ops;
    let charBank = unpacked.charBank;

    const assem = new SmartOpAssembler();
    let oldPos = 0;
    let calcNewLen = 0;
    for (const o of ChangeSet.deserializeOps(ops)) {
      switch (o.opcode) {
        case '=':
          oldPos += o.chars;
          calcNewLen += o.chars;
          break;
        case '-':
          oldPos += o.chars;
          assert(oldPos <= oldLen, `${oldPos} > ${oldLen} in ${cs}`);
          break;
        case '+': {
          assert(
            charBank.length >= o.chars,
            'Invalid changeset: not enough chars in charBank'
          );
          const chars = charBank.slice(0, o.chars);
          const nlines = (chars.match(/\n/g) || []).length;
          assert(
            nlines === o.lines,
            'Invalid changeset: number of newlines in insert op does not match the charBank'
          );
          assert(
            o.lines === 0 || chars.endsWith('\n'),
            'Invalid changeset: multiline insert op does not end with a newline'
          );
          charBank = charBank.slice(o.chars);
          calcNewLen += o.chars;
          assert(calcNewLen <= newLen, `${calcNewLen} > ${newLen} in ${cs}`);
          break;
        }
        default:
          assert(
            false,
            `Invalid changeset: Unknown opcode: ${JSON.stringify(o.opcode)}`
          );
      }
      assem.append(o);
    }
    calcNewLen += oldLen - oldPos;
    assert(
      calcNewLen === newLen,
      'Invalid changeset: claimed length does not match actual length'
    );
    assert(
      charBank === '',
      'Invalid changeset: excess characters in the charBank'
    );
    assem.endDocument();
    const normalized = exports.pack(
      oldLen,
      calcNewLen,
      assem.toString(),
      unpacked.charBank
    );
    assert(normalized === cs, 'Invalid changeset: not in canonical form');
    return cs;
  };

  static splitAttributionLines = (attrOps: string, text: string) => {
    const assem = new MergingOpAssembler();
    const lines: string[] = [];
    let pos = 0;

    const appendOp = (op: Op) => {
      assem.append(op);
      if (op.lines > 0) {
        lines.push(assem.toString());
        assem.clear();
      }
      pos += op.chars;
    };

    for (const op of ChangeSet.deserializeOps(attrOps)) {
      let numChars = op.chars;
      let numLines = op.lines;
      while (numLines > 1) {
        const newlineEnd = text.indexOf('\n', pos) + 1;
        assert(newlineEnd > 0, 'newlineEnd <= 0 in splitAttributionLines');
        op.chars = newlineEnd - pos;
        op.lines = 1;
        appendOp(op);
        numChars -= op.chars;
        numLines -= op.lines;
      }
      if (numLines === 1) {
        op.chars = numChars;
        op.lines = 1;
      }
      appendOp(op);
    }

    return lines;
  };

  /**
   * Like "substring" but on a single-line attribution string.
   */
  static subattribution = (astr: any, start: number, optEnd?: number) => {
    const attOps = ChangeSet.deserializeOps(astr);
    let attOpsNext = attOps.next();
    const assem = new SmartOpAssembler();
    let attOp = new Op();
    const csOp = new Op();

    const doCsOp = () => {
      if (!csOp.chars) return;
      while (csOp.opcode && (attOp.opcode || !attOpsNext.done)) {
        if (!attOp.opcode) {
          attOp = attOpsNext.value!;
          attOpsNext = attOps.next();
        }
        if (
          csOp.opcode &&
          attOp.opcode &&
          csOp.chars >= attOp.chars &&
          attOp.lines > 0 &&
          csOp.lines <= 0
        ) {
          csOp.lines++;
        }
        const opOut = ChangeSet.slicerZipperFunc(attOp, csOp, null);
        if (opOut.opcode) assem.append(opOut);
      }
    };

    csOp.opcode = '-';
    csOp.chars = start;

    doCsOp();

    if (optEnd === undefined) {
      if (attOp.opcode) {
        assem.append(attOp);
      }
      while (!attOpsNext.done) {
        assem.append(attOpsNext.value);
        attOpsNext = attOps.next();
      }
    } else {
      csOp.opcode = '=';
      csOp.chars = optEnd - start;
      doCsOp();
    }

    return assem.toString();
  };
}
