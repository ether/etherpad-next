import { OpAssembler } from '@/service/pads/OpAssembler';
import { clearOp, copyOp } from '@/utils/service/utilFuncs';

export class MergingOpAssembler {
  private assem;
  private bufOp;
  private bufOpAdditionalCharsAfterNewline;

  constructor() {
    this.assem = new OpAssembler();
    this.bufOp = new Op();
    this.bufOpAdditionalCharsAfterNewline = 0;
  }

  flush(isEndDocument?: boolean) {
    if (!this.bufOp.opcode) return;
    if (isEndDocument && this.bufOp.opcode === '=' && !this.bufOp.attribs) {
      // final merged keep, leave it implicit
    } else {
      this.assem.append(this.bufOp);
      if (this.bufOpAdditionalCharsAfterNewline) {
        this.bufOp.chars = this.bufOpAdditionalCharsAfterNewline;
        this.bufOp.lines = 0;
        this.assem.append(this.bufOp);
        this.bufOpAdditionalCharsAfterNewline = 0;
      }
    }
    this.bufOp.opcode = '';
  }

  append = (op: Op) => {
    if (op.chars <= 0) return;
    if (this.bufOp.opcode === op.opcode && this.bufOp.attribs === op.attribs) {
      if (op.lines > 0) {
        // bufOp and additional chars are all mergeable into a multi-line op
        this.bufOp.chars += this.bufOpAdditionalCharsAfterNewline + op.chars;
        this.bufOp.lines += op.lines;
        this.bufOpAdditionalCharsAfterNewline = 0;
      } else if (this.bufOp.lines === 0) {
        // both bufOp and op are in-line
        this.bufOp.chars += op.chars;
      } else {
        // append in-line text to multi-line bufOp
        this.bufOpAdditionalCharsAfterNewline += op.chars;
      }
    } else {
      this.flush();
      copyOp(op, this.bufOp);
    }
  };

  endDocument = () => {
    this.flush(true);
  };

  toString = () => {
    this.flush();
    return this.assem.toString();
  };

  clear = () => {
    this.assem.clear();
    clearOp(this.bufOp);
  };
}
