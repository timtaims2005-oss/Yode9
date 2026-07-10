/**
 * LZ-String Compression — reduces localStorage/IndexedDB footprint by 60-80%.
 * Pure TypeScript LZ77 variant, no dependencies.
 * Compress chat history before saving, decompress on load.
 */

const KEY_STR_URI = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";

function getBaseValue(alphabet: string, character: string): number {
  return alphabet.indexOf(character);
}

export function compressToBase64(input: string): string {
  if (!input) return input;
  return _compress(input, 6, (a: number) => KEY_STR_URI.charAt(a)) + "=";
}

export function decompressFromBase64(input: string): string {
  if (!input) return input;
  return _decompress(input.length, 32, (idx: number) => getBaseValue(KEY_STR_URI, input.charAt(idx))) ?? "";
}

export function compressToUTF16(input: string): string {
  if (!input) return input;
  return _compress(input, 15, (a: number) => String.fromCharCode(a + 32)) + " ";
}

export function decompressFromUTF16(compressed: string): string {
  if (!compressed) return compressed;
  return _decompress(compressed.length, 16384, (idx: number) => compressed.charCodeAt(idx) - 32) ?? "";
}

function _compress(uncompressed: string, bitsPerChar: number, getCharFromInt: (n: number) => string): string {
  let i = 0, value: number;
  const context_dictionary: Record<string, number> = {};
  const context_dictionaryToCreate: Record<string, boolean> = {};
  let context_c = "", context_wc = "", context_w = "";
  let context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2;
  const context_data: string[] = [];
  let context_data_val = 0, context_data_position = 0;

  for (let ii = 0; ii < uncompressed.length; ii++) {
    context_c = uncompressed.charAt(ii);
    if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
      context_dictionary[context_c] = context_dictSize++;
      context_dictionaryToCreate[context_c] = true;
    }
    context_wc = context_w + context_c;
    if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
      context_w = context_wc;
    } else {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1); if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 8; i++) { context_data_val = (context_data_val << 1) | (value & 1); value >>= 1; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
        } else {
          value = 1;
          for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1) | value; value = 0; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 16; i++) { context_data_val = (context_data_val << 1) | (value & 1); value >>= 1; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1) | (value & 1); value >>= 1; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
      }
      context_enlargeIn--;
      if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
      context_dictionary[context_wc] = context_dictSize++;
      context_w = context_c;
    }
  }
  if (context_w !== "") {
    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
      if (context_w.charCodeAt(0) < 256) {
        for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1); if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
        value = context_w.charCodeAt(0);
        for (i = 0; i < 8; i++) { context_data_val = (context_data_val << 1) | (value & 1); value >>= 1; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
      } else {
        value = 1;
        for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1) | value; value = 0; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
        value = context_w.charCodeAt(0);
        for (i = 0; i < 16; i++) { context_data_val = (context_data_val << 1) | (value & 1); value >>= 1; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
      }
      delete context_dictionaryToCreate[context_w];
    } else {
      value = context_dictionary[context_w];
      for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1) | (value & 1); value >>= 1; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
    }
    context_enlargeIn--;
    if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
  }
  value = 2;
  for (i = 0; i < context_numBits; i++) { context_data_val = (context_data_val << 1) | (value & 1); value >>= 1; if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; } }
  while (true) {
    context_data_val = (context_data_val << 1);
    if (context_data_position == bitsPerChar - 1) { context_data.push(getCharFromInt(context_data_val)); break; }
    else context_data_position++;
  }
  return context_data.join("");
}

function _decompress(length: number, resetValue: number, getNextValue: (n: number) => number): string | null {
  const dictionary: string[] = [];
  let next: number, enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = "";
  let i: number, w: string, bits = 0, maxpower: number, power: number, c: string;
  let data_val = getNextValue(0), data_position = resetValue, data_index = 1;

  for (i = 0; i < 3; i++) dictionary[i] = String(i);

  bits = 0; maxpower = Math.pow(2, 2); power = 1;
  while (power != maxpower) { const resb = data_val & data_position; data_position >>= 1; if (data_position == 0) { data_position = resetValue; data_val = getNextValue(data_index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
  switch (next = bits) {
    case 0: bits = 0; maxpower = Math.pow(2, 8); power = 1; while (power != maxpower) { const resb = data_val & data_position; data_position >>= 1; if (data_position == 0) { data_position = resetValue; data_val = getNextValue(data_index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } c = String.fromCharCode(bits); break;
    case 1: bits = 0; maxpower = Math.pow(2, 16); power = 1; while (power != maxpower) { const resb = data_val & data_position; data_position >>= 1; if (data_position == 0) { data_position = resetValue; data_val = getNextValue(data_index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } c = String.fromCharCode(bits); break;
    case 2: return "";
    default: return null;
  }
  dictionary[3] = c; w = c; result = c;
  while (true) {
    if (data_index > length) return "";
    bits = 0; maxpower = Math.pow(2, numBits); power = 1;
    while (power != maxpower) { const resb = data_val & data_position; data_position >>= 1; if (data_position == 0) { data_position = resetValue; data_val = getNextValue(data_index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
    switch (c = String(next = bits)) {
      case "0": bits = 0; maxpower = Math.pow(2, 8); power = 1; while (power != maxpower) { const resb = data_val & data_position; data_position >>= 1; if (data_position == 0) { data_position = resetValue; data_val = getNextValue(data_index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } dictionary[dictSize++] = String.fromCharCode(bits); c = String(dictSize - 1); enlargeIn--; break;
      case "1": bits = 0; maxpower = Math.pow(2, 16); power = 1; while (power != maxpower) { const resb = data_val & data_position; data_position >>= 1; if (data_position == 0) { data_position = resetValue; data_val = getNextValue(data_index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; } dictionary[dictSize++] = String.fromCharCode(bits); c = String(dictSize - 1); enlargeIn--; break;
      case "2": return result;
    }
    if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
    if (dictionary[parseInt(c)]) { entry = dictionary[parseInt(c)]; } else { if (parseInt(c) === dictSize) { entry = w + w.charAt(0); } else { return null; } }
    result += entry;
    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;
    if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
    w = entry;
  }
}

/** Compress JSON object → base64 string */
export function compressJSON(obj: unknown): string {
  return compressToBase64(JSON.stringify(obj));
}

/** Decompress base64 string → parsed object */
export function decompressJSON<T = unknown>(compressed: string): T | null {
  try {
    const json = decompressFromBase64(compressed);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Estimate compression ratio */
export function compressionRatio(original: string, compressed: string): number {
  return compressed.length / original.length;
}
