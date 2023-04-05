export const hexify = (data: string | bigint, targetLength?: number): string => {
  let hash = '';

  if (typeof data === 'bigint') {
    hash = data.toString(16);
  }

  if (typeof data === 'string') {
    if (data.slice(0, 2) === '0x') {
      hash = data.slice(2);
    } else if (/^\d+$/.test(data)) {
      hash = BigInt(data).toString(16);
    } else if (/^[0-9a-fA-F]+$/.test(data)) {
      hash = data;
    }
  }

  if (targetLength) hash = hash.padStart(targetLength, '0');

  return '0x' + hash;
};
