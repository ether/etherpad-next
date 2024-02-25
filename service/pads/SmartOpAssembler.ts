import { MergingOpAssembler } from '@/service/pads/MergingOpAssembler';
import { StringAssembler } from '@/service/pads/StringAssembler';
import { opsFromText } from '@/utils/service/utilFuncs';
export class SmartOpAssembler {
  private minusAssem = new MergingOpAssembler();
  private plusAssem = new MergingOpAssembler();
  private keepAssem = new MergingOpAssembler();
  private assem = new StringAssembler();
  private lastOpcode = '';
  private lengthChange = 0;

  flushKeeps = () => {
    this.assem.append(this.keepAssem.toString());
    this.keepAssem.clear();
  };

  flushPlusMinus = () => {
    this.assem.append(this.minusAssem.toString());
    this.minusAssem.clear();
    this.assem.append(this.plusAssem.toString());
    this.plusAssem.clear();
  };

  append = (op: Op) => {
    if (!op.opcode) return;
    if (!op.chars) return;

    if (op.opcode === '-') {
      if (this.lastOpcode === '=') {
        this.flushKeeps();
      }
      this.minusAssem.append(op);
      this.lengthChange -= op.chars;
    } else if (op.opcode === '+') {
      if (this.lastOpcode === '=') {
        this.flushKeeps();
      }
      this.plusAssem.append(op);
      this.lengthChange += op.chars;
    } else if (op.opcode === '=') {
      if (this.lastOpcode !== '=') {
        this.flushPlusMinus();
      }
      this.keepAssem.append(op);
    }
    this.lastOpcode = op.opcode;
  };

  /**
   * Generates operations from the given text and attributes.
   *
   * @deprecated Use `opsFromText` instead.
   * @param {('-'|'+'|'=')} opcode - The operator to use.
   * @param {string} text - The text to remove/add/keep.
   * @param {(string|Iterable<Attribute>)} attribs - The attributes to apply to the operations.
   * @param {?AttributePool} pool - Attribute pool. Only required if `attribs` is an iterable of
   *     attribute key, value pairs.
   */
  appendOpWithText = (opcode: ('-'|'+'|'='), text: string, attribs: string|Iterable<any>, pool: any) => {
    for (const op of opsFromText(opcode, text, attribs, pool)) this.append(op);
  };


  toString = () => {
    this.flushPlusMinus();
    this.flushKeeps();
    return this.assem.toString();
  };

  clear = () => {
    this.minusAssem.clear();
    this.plusAssem.clear();
    this. keepAssem.clear();
    this.assem.clear();
    this.lengthChange = 0;
  };

  endDocument = () => {
    this.keepAssem.endDocument();
  };

  getLengthChange = () => this.lengthChange;
}

