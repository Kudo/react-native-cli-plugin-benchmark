/**
 * @format
 */

import fs from 'fs';

export default class ObjcPatcher {
  _content: string;
  _patchSig: string;

  constructor(fromFile: string, patchSignature: string) {
    this._content = fs.readFileSync(fromFile, {encoding: 'utf8'});
    this._patchSig = `/* Patched by ObjcPatcher: ${patchSignature} */\n`;
  }

  isPatched(): boolean {
    return this._content.indexOf(this._patchSig) >= 0;
  }

  addImport(file: string): ObjcPatcher {
    const lastImportBegin = this._content.lastIndexOf('\n#import');
    const lastImportEnd = this._content.indexOf('\n', lastImportBegin + 1);
    const headPart = this._content.substring(0, lastImportEnd);
    const tailPart = this._content.substring(lastImportEnd);
    this._content = headPart + `\n#import ${file}` + tailPart;
    return this;
  }

  addFunction(code: string): ObjcPatcher {
    const lastImplEnd = this._content.lastIndexOf('\n@end');
    const headPart = this._content.substring(0, lastImplEnd);
    const tailPart = this._content.substring(lastImplEnd);
    this._content = headPart + `\n${code}` + tailPart;
    return this;
  }

  replace(searchValue: string | RegExp, replaceValue: string): ObjcPatcher {
    this._content = this._content.replace(searchValue, replaceValue);
    return this;
  }

  write(toFile: string): void {
    this._addPatchSigIfNeeded();
    fs.writeFileSync(toFile, this._content);
  }

  _addPatchSigIfNeeded(): ObjcPatcher {
    if (this.isPatched()) {
      return this;
    }
    this._content = this._patchSig + this._content;
    return this;
  }
}
