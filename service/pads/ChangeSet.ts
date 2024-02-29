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
import { Attribute } from '@/types/Attribute';
import { TextLinesMutator } from '@/backend/handler/TextMutator';
import { ChangeSetBuilder } from '@/service/pads/ChangeSetBuilder';
import { MapArrayType } from '@/types/MapArrayType';

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
  ): string => {
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
   * Creates the identity Changeset of length N.
   *
   * @param {number} N - length of the identity changeset
   * @returns {string}
   */
  static identity = (N: number): string => this.pack(N, N, '', '');

  /**
   * Applies a changeset on an array of lines.
   *
   * @param {string} cs - the changeset to apply
   * @param {string[]} lines - The lines to which the changeset needs to be applied
   */
  static mutateTextLines = (cs: string, lines: string[]) => {
    const unpacked = this.unpack(cs);
    const bankIter = new StringIterator(unpacked.charBank);
    const mut = new TextLinesMutator(lines);
    for (const op of this.deserializeOps(unpacked.ops)) {
      switch (op.opcode) {
        case '+':
          mut.insert(bankIter.take(op.chars), op.lines);
          break;
        case '-':
          mut.remove(op.chars, op.lines);
          break;
        case '=':
          mut.skip(op.chars, op.lines, (!!op.attribs));
          break;
      }
    }
    mut.close();
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
        ? `>${ChangeSet.numToString(lenDiff)}`
        : `<${ChangeSet.numToString(-lenDiff)}`;
    const a = [];
    a.push('Z:', ChangeSet.numToString(oldLen), lenDiffStr, opsStr, '$', bank);
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
   * Clones a AText structure.
   *
   * @param {AText} atext -
   * @returns {AText}
   */
  static cloneAText = (atext: AText):AText => {
    if (!atext) error('atext is null');
    return {
      text: atext.text,
      attribs: atext.attribs,
    };
  };

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
    const normalized = ChangeSet.pack(
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


  static oldLen = (cs: string) => ChangeSet.unpack(cs).oldLen;
  static newLen = (cs: string) => ChangeSet.unpack(cs).newLen;


  /**
   * Returns a function that tests if a string of attributes (e.g. '*3*4') contains a given attribute
   * key,value that is already present in the pool.
   *
   * @param {Attribute} attribPair - `[key, value]` pair of strings.
   * @param {AttributePool} pool - Attribute pool
   * @returns {Function}
   */
   static attributeTester = (attribPair: Attribute, pool: AttributePool): Function => {
    const never = (attribs: Attribute) => false;
    if (!pool) return never;
    const attribNum = pool.putAttrib(attribPair, true);
    if (attribNum < 0) return never;
    const re = new RegExp(`\\*${ChangeSet.numToString(attribNum)}(?!\\w)`);
    return (attribs: string) => re.test(attribs);
  };
  static follow = (cs1: string, cs2: string, reverseInsertOrder: boolean, pool: AttributePool) => {
    const unpacked1 = ChangeSet.unpack(cs1);
    const unpacked2 = ChangeSet.unpack(cs2);
    const len1 = unpacked1.oldLen;
    const len2 = unpacked2.oldLen;
    assert(len1 === len2, 'mismatched follow - cannot transform cs1 on top of cs2');
    const chars1 = new StringIterator(unpacked1.charBank);
    const chars2 = new StringIterator(unpacked2.charBank);

    const oldLen = unpacked1.newLen;
    let oldPos = 0;
    let newLen = 0;

    const hasInsertFirst = this.attributeTester(['insertorder', 'first'], pool);

    const newOps = this.applyZip(unpacked1.ops, unpacked2.ops, (op1: Op, op2:Op) => {
      const opOut = new Op();
      if (op1.opcode === '+' || op2.opcode === '+') {
        let whichToDo;
        if (op2.opcode !== '+') {
          whichToDo = 1;
        } else if (op1.opcode !== '+') {
          whichToDo = 2;
        } else {
          // both +
          const firstChar1 = chars1.peek(1);
          const firstChar2 = chars2.peek(1);
          const insertFirst1 = hasInsertFirst(op1.attribs);
          const insertFirst2 = hasInsertFirst(op2.attribs);
          if (insertFirst1 && !insertFirst2) {
            whichToDo = 1;
          } else if (insertFirst2 && !insertFirst1) {
            whichToDo = 2;
          } else if (firstChar1 === '\n' && firstChar2 !== '\n') {
            // insert string that doesn't start with a newline first so as not to break up lines
            whichToDo = 2;
          } else if (firstChar1 !== '\n' && firstChar2 === '\n') {
            whichToDo = 1;
          } else if (reverseInsertOrder) {
            // break symmetry:
            whichToDo = 2;
          } else {
            whichToDo = 1;
          }
        }
        if (whichToDo === 1) {
          chars1.skip(op1.chars);
          opOut.opcode = '=';
          opOut.lines = op1.lines;
          opOut.chars = op1.chars;
          opOut.attribs = '';
          op1.opcode = '';
        } else {
          // whichToDo == 2
          chars2.skip(op2.chars);
          copyOp(op2, opOut);
          op2.opcode = '';
        }
      } else if (op1.opcode === '-') {
        if (!op2.opcode) {
          op1.opcode = '';
        } else if (op1.chars <= op2.chars) {
          op2.chars -= op1.chars;
          op2.lines -= op1.lines;
          op1.opcode = '';
          if (!op2.chars) {
            op2.opcode = '';
          }
        } else {
          op1.chars -= op2.chars;
          op1.lines -= op2.lines;
          op2.opcode = '';
        }
      } else if (op2.opcode === '-') {
        copyOp(op2, opOut);
        if (!op1.opcode) {
          op2.opcode = '';
        } else if (op2.chars <= op1.chars) {
          // delete part or all of a keep
          op1.chars -= op2.chars;
          op1.lines -= op2.lines;
          op2.opcode = '';
          if (!op1.chars) {
            op1.opcode = '';
          }
        } else {
          // delete all of a keep, and keep going
          opOut.lines = op1.lines;
          opOut.chars = op1.chars;
          op2.lines -= op1.lines;
          op2.chars -= op1.chars;
          op1.opcode = '';
        }
      } else if (!op1.opcode) {
        copyOp(op2, opOut);
        op2.opcode = '';
      } else if (!op2.opcode) {
        // @NOTE: Critical bugfix for EPL issue #1625. We do not copy op1 here
        // in order to prevent attributes from leaking into result changesets.
        // copyOp(op1, opOut);
        op1.opcode = '';
      } else {
        // both keeps
        opOut.opcode = '=';
        opOut.attribs = ChangeSet.followAttributes(op1.attribs, op2.attribs, pool);
        if (op1.chars <= op2.chars) {
          opOut.chars = op1.chars;
          opOut.lines = op1.lines;
          op2.chars -= op1.chars;
          op2.lines -= op1.lines;
          op1.opcode = '';
          if (!op2.chars) {
            op2.opcode = '';
          }
        } else {
          opOut.chars = op2.chars;
          opOut.lines = op2.lines;
          op1.chars -= op2.chars;
          op1.lines -= op2.lines;
          op2.opcode = '';
        }
      }
      switch (opOut.opcode) {
        case '=':
          oldPos += opOut.chars;
          newLen += opOut.chars;
          break;
        case '-':
          oldPos += opOut.chars;
          break;
        case '+':
          newLen += opOut.chars;
          break;
      }
      return opOut;
    });
    newLen += oldLen - oldPos;

    return this.pack(oldLen, newLen, newOps, unpacked2.charBank);
  };

  static prepareForWire = (cs: string, pool: AttributePool) => {
    const newPool = new AttributePool();
    const newCs = ChangeSet.moveOpsToNewPool(cs, pool, newPool);
    return {
      translated: newCs,
      pool: newPool,
    };
  };

  static followAttributes = (att1: string, att2: string, pool: AttributePool) => {
    // The merge of two sets of attribute changes to the same text
    // takes the lexically-earlier value if there are two values
    // for the same key.  Otherwise, all key/value changes from
    // both attribute sets are taken.  This operation is the "follow",
    // so a set of changes is produced that can be applied to att1
    // to produce the merged set.
    if ((!att2) || (!pool)) return '';
    if (!att1) return att2;
    const atts = new Map();
    att2.replace(/\*([0-9a-z]+)/g, (_, a) => {
      const [key, val] = pool.getAttrib(parseNum(a));
      atts.set(key, val);
      return '';
    });
    att1.replace(/\*([0-9a-z]+)/g, (_, a) => {
      const [key, val] = pool.getAttrib(parseNum(a));
      if (atts.has(key) && val <= atts.get(key)) atts.delete(key);
      return '';
    });
    // we've only removed attributes, so they're already sorted
    const buf = new StringAssembler();
    for (const att of atts) {
      buf.append('*');
      buf.append(this.numToString(pool.putAttrib(att)));
    }
    return buf.toString();
  };


  /**
   * Iterate over attributes in a changeset and move them from oldPool to newPool.
   *
   * @param {string} cs - Chageset/attribution string to iterate over
   * @param {AttributePool} oldPool - old attributes pool
   * @param {AttributePool} newPool - new attributes pool
   * @returns {string} the new Changeset
   */
  static moveOpsToNewPool = (cs: string, oldPool: AttributePool, newPool: AttributePool): string => {
    // works on exports or attribution string
    let dollarPos = cs.indexOf('$');
    if (dollarPos < 0) {
      dollarPos = cs.length;
    }
    const upToDollar = cs.substring(0, dollarPos);
    const fromDollar = cs.substring(dollarPos);
    // order of attribs stays the same
    return upToDollar.replace(/\*([0-9a-z]+)/g, (_, a) => {
      const oldNum = parseNum(a);
      const pair = oldPool.getAttrib(oldNum);
      // The attribute might not be in the old pool if the user is viewing the current revision in the
      // timeslider and text is deleted. See: https://github.com/ether/etherpad-lite/issues/3932
      if (!pair) return '';
      const newNum = newPool.putAttrib(pair);
      return `*${ChangeSet.numToString(newNum)}`;
    }) + fromDollar;
  };

  /**
   * Splits text into lines.
   *
   * @param {string} text - text to split
   * @returns {string[]}
   */
  static splitTextLines = (text: string): string[] => text.match(/[^\n]*(?:\n|[^\n]$)/g) as string[];


  /**
   * Compose two Changesets.
   *
   * @param {string} cs1 - first Changeset
   * @param {string} cs2 - second Changeset
   * @param {AttributePool} pool - Attribs pool
   * @returns {string}
   */
  static compose = (cs1: string, cs2: string, pool: AttributePool) => {
    const unpacked1 = this.unpack(cs1);
    const unpacked2 = this.unpack(cs2);
    const len1 = unpacked1.oldLen;
    const len2 = unpacked1.newLen;
    assert(len2 === unpacked2.oldLen, 'mismatched composition of two changesets');
    const len3 = unpacked2.newLen;
    const bankIter1 = new StringIterator(unpacked1.charBank);
    const bankIter2 = new StringIterator(unpacked2.charBank);
    const bankAssem = new StringAssembler();

    const newOps = ChangeSet.applyZip(unpacked1.ops, unpacked2.ops, (op1: Op, op2: Op) => {
      const op1code = op1.opcode;
      const op2code = op2.opcode;
      if (op1code === '+' && op2code === '-') {
        bankIter1.skip(Math.min(op1.chars, op2.chars));
      }
      const opOut = this.slicerZipperFunc(op1, op2, pool);
      if (opOut.opcode === '+') {
        if (op2code === '+') {
          bankAssem.append(bankIter2.take(opOut.chars));
        } else {
          bankAssem.append(bankIter1.take(opOut.chars));
        }
      }
      return opOut;
    });

    return this.pack(len1, len3, newOps, bankAssem.toString());
  };



  static inverse = (cs: string, lines: any, alines: any, pool: AttributePool) => {
    // lines and alines are what the exports is meant to apply to.
    // They may be arrays or objects with .get(i) and .length methods.
    // They include final newlines on lines.

    const linesGet = (idx: number) => {
      if (lines.get) {
        return lines.get(idx);
      } else {
        return lines[idx];
      }
    };

    /**
     * @param {number} idx -
     * @returns {string}
     */
    const alinesGet = (idx: number):string => {
      if (alines.get) {
        return alines.get(idx);
      } else {
        return alines[idx];
      }
    };

    let curLine = 0;
    let curChar = 0;
    let curLineOps: any = null;
    let curLineOpsNext:any = null;
    let curLineOpsLine:any;
    let curLineNextOp = new Op('+');

    const unpacked = this.unpack(cs);
    const builder = new ChangeSetBuilder(unpacked.newLen);

    const consumeAttribRuns = (numChars: number, func: Function /* (len, attribs, endsLine)*/) => {
      if (!curLineOps || curLineOpsLine !== curLine) {
        curLineOps = this.deserializeOps(alinesGet(curLine));
        curLineOpsNext = curLineOps.next();
        curLineOpsLine = curLine;
        let indexIntoLine = 0;
        while (!curLineOpsNext.done) {
          curLineNextOp = curLineOpsNext.value;
          curLineOpsNext = curLineOps.next();
          if (indexIntoLine + curLineNextOp.chars >= curChar) {
            curLineNextOp.chars -= (curChar - indexIntoLine);
            break;
          }
          indexIntoLine += curLineNextOp.chars;
        }
      }

      while (numChars > 0) {
        if (!curLineNextOp.chars && curLineOpsNext.done) {
          curLine++;
          curChar = 0;
          curLineOpsLine = curLine;
          curLineNextOp.chars = 0;
          curLineOps = this.deserializeOps(alinesGet(curLine));
          curLineOpsNext = curLineOps.next();
        }
        if (!curLineNextOp.chars) {
          if (curLineOpsNext.done) {
            curLineNextOp = new Op();
          } else {
            curLineNextOp = curLineOpsNext.value;
            curLineOpsNext = curLineOps.next();
          }
        }
        const charsToUse = Math.min(numChars, curLineNextOp.chars);
        func(charsToUse, curLineNextOp.attribs, charsToUse === curLineNextOp.chars &&
          curLineNextOp.lines > 0);
        numChars -= charsToUse;
        curLineNextOp.chars -= charsToUse;
        curChar += charsToUse;
      }

      if (!curLineNextOp.chars && curLineOpsNext.done) {
        curLine++;
        curChar = 0;
      }
    };

    const skip = (N: number, L?: number) => {
      if (L) {
        curLine += L;
        curChar = 0;
      } else if (curLineOps && curLineOpsLine === curLine) {
        consumeAttribRuns(N, () => {});
      } else {
        curChar += N;
      }
    };

    const nextText = (numChars: number) => {
      let len = 0;
      const assem = new StringAssembler();
      const firstString = linesGet(curLine).substring(curChar);
      len += firstString.length;
      assem.append(firstString);

      let lineNum = curLine + 1;
      while (len < numChars) {
        const nextString = linesGet(lineNum);
        len += nextString.length;
        assem.append(nextString);
        lineNum++;
      }

      return assem.toString().substring(0, numChars);
    };

    const cachedStrFunc = (func: Function) => {
      const cache:MapArrayType<any> = {};
      return (s: string) => {
        if (!cache[s]) {
          cache[s] = func(s);
        }
        return cache[s];
      };
    };

    for (const csOp of this.deserializeOps(unpacked.ops)) {
      if (csOp.opcode === '=') {
        if (csOp.attribs) {
          const attribs = AttributeMap.fromString(csOp.attribs, pool);
          const undoBackToAttribs = cachedStrFunc((oldAttribsStr: string) => {
            const oldAttribs = AttributeMap.fromString(oldAttribsStr, pool);
            const backAttribs = new AttributeMap(pool);
            for (const [key, value] of attribs) {
              const oldValue = oldAttribs.get(key) || '';
              if (oldValue !== value) backAttribs.set(key, oldValue);
            }
            // TODO: backAttribs does not restore removed attributes (it is missing attributes that
            // are in oldAttribs but not in attribs). I don't know if that is intentional.
            return backAttribs.toString();
          });
          consumeAttribRuns(csOp.chars, (len: number, attribs: string, endsLine: number) => {
            builder.keep(len, endsLine ? 1 : 0, undoBackToAttribs(attribs));
          });
        } else {
          skip(csOp.chars, csOp.lines);
          builder.keep(csOp.chars, csOp.lines);
        }
      } else if (csOp.opcode === '+') {
        builder.remove(csOp.chars, csOp.lines);
      } else if (csOp.opcode === '-') {
        const textBank = nextText(csOp.chars);
        let textBankIndex = 0;
        consumeAttribRuns(csOp.chars, (len: number, attribs: string, endsLine: number) => {
          builder.insert(textBank.substr(textBankIndex, len), attribs);
          textBankIndex += len;
        });
      }
    }

    return this.checkRep(builder.toString());
  };


  /**
   * Applies a changeset to an array of attribute lines.
   *
   * @param {string} cs - The encoded changeset.
   * @param {Array<string>} lines - Attribute lines. Modified in place.
   * @param {AttributePool} pool - Attribute pool.
   */
  static mutateAttributionLines = (cs: string, lines: string[], pool:AttributePool) => {
    const unpacked = this.unpack(cs);
    const csOps = this.deserializeOps(unpacked.ops);
    let csOpsNext = csOps.next();
    const csBank = unpacked.charBank;
    let csBankIndex = 0;
    // treat the attribution lines as text lines, mutating a line at a time
    const mut = new TextLinesMutator(lines);

    /**
     * The Ops in the current line from `lines`.
     *
     * @type {?Generator<Op>}
     */
    let lineOps: any|null = null;
    let lineOpsNext:any|null = null;

    // @ts-ignore
    const lineOpsHasNext = () => lineOpsNext && !lineOpsNext.done;
    /**
     * Returns false if we are on the last attribute line in `lines` and there is no additional op in
     * that line.
     *
     * @returns {boolean} True if there are more ops to go through.
     */
    const isNextMutOp = (): boolean => lineOpsHasNext() || mut.hasMore();

    /**
     * @returns {Op} The next Op from `lineIter`. If there are no more Ops, `lineIter` is reset to
     *     iterate over the next line, which is consumed from `mut`. If there are no more lines,
     *     returns a null Op.
     */
    const nextMutOp = (): Op => {
      if (!lineOpsHasNext() && mut.hasMore()) {
        // There are more attribute lines in `lines` to do AND either we just started so `lineIter` is
        // still null or there are no more ops in current `lineIter`.
        const line = mut.removeLines(1);
        lineOps = this.deserializeOps(line);
        lineOpsNext = lineOps.next();
      }
      if (!lineOpsHasNext()) return new Op(); // No more ops and no more lines.
      const op = lineOpsNext.value;
      lineOpsNext = lineOps.next();
      return op;
    };
    let lineAssem:MergingOpAssembler|null = null;

    /**
     * Appends an op to `lineAssem`. In case `lineAssem` includes one single newline, adds it to the
     * `lines` mutator.
     */
    const outputMutOp = (op: Op) => {
      if (!lineAssem) {
        lineAssem =  new MergingOpAssembler();
      }
      lineAssem.append(op);
      if (op.lines <= 0) return;
      assert(op.lines === 1, `Can't have op.lines of ${op.lines} in attribution lines`);
      // ship it to the mut
      mut.insert(lineAssem.toString(), 1);
      lineAssem = null;
    };

    let csOp = new Op();
    let attOp = new Op();
    while (csOp.opcode || !csOpsNext.done || attOp.opcode || isNextMutOp()) {
      if (!csOp.opcode && !csOpsNext.done) {
        // coOp done, but more ops in cs.
        csOp = csOpsNext.value;
        csOpsNext = csOps.next();
      }
      if (!csOp.opcode && !attOp.opcode && !lineAssem && !lineOpsHasNext()) {
        break; // done
      } else if (csOp.opcode === '=' && csOp.lines > 0 && !csOp.attribs && !attOp.opcode &&
        !lineAssem && !lineOpsHasNext()) {
        // Skip multiple lines without attributes; this is what makes small changes not order of the
        // document size.
        mut.skipLines(csOp.lines);
        csOp.opcode = '';
      } else if (csOp.opcode === '+') {
        const opOut = copyOp(csOp);
        if (csOp.lines > 1) {
          // Copy the first line from `csOp` to `opOut`.
          const firstLineLen = csBank.indexOf('\n', csBankIndex) + 1 - csBankIndex;
          csOp.chars -= firstLineLen;
          csOp.lines--;
          opOut.lines = 1;
          opOut.chars = firstLineLen;
        } else {
          // Either one or no newlines in '+' `csOp`, copy to `opOut` and reset `csOp`.
          csOp.opcode = '';
        }
        outputMutOp(opOut);
        csBankIndex += opOut.chars;
      } else {
        if (!attOp.opcode && isNextMutOp()) attOp = nextMutOp();
        const opOut = this.slicerZipperFunc(attOp, csOp, pool);
        if (opOut.opcode) outputMutOp(opOut);
      }
    }

    assert(!lineAssem, `line assembler not finished:${cs}`);
    mut.close();
  };
}



