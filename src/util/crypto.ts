import EC from 'elliptic';
import { Strategy, ZkIdentity } from '@zk-kit/identity';

export const hexToUintArray = (hex: string): Uint8Array => {
  const a = [];
  for (let i = 0, len = hex.length; i < len; i += 2) {
    a.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(a);
};

export const hexToArrayBuf = (hex: string): ArrayBuffer => {
  return hexToUintArray(hex).buffer;
};

export const sha256 = async (data: string): Promise<string> => {
  const arraybuf = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', arraybuf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const sha512 = async (data: string): Promise<string> => {
  const arraybuf = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-512', arraybuf);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const signWithP256 = (base64PrivateKey: string, data: string) => {
  const buff = base64ToArrayBuffer(base64PrivateKey);
  const hex = Buffer.from(buff).toString('hex');
  const ec = new EC.ec('p256');
  const key = ec.keyFromPrivate(hex);
  const msgHash = Buffer.from(data, 'utf-8').toString('hex');
  const signature = key.sign(msgHash);
  return Buffer.from(signature.toDER()).toString('hex');
};

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64.replace(/_/g, '/').replace(/-/g, '+'));
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export const arrayBufToBase64UrlEncode = (buf: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\//g, '_').replace(/=/g, '').replace(/\+/g, '-');
};

// export const jwkConv = (prvHex: string, pubHex: string) => ({
//     kty: "EC",
//     crv: "P-256",
//     ext: true,
//     x: arrayBufToBase64UrlEncode(hexToArrayBuf(pubHex).slice(1, 33)),
//     y: arrayBufToBase64UrlEncode(hexToArrayBuf(pubHex).slice(33, 66))
// });

export const generateGunKeyPairFromHex = async (
  hashHex: string
): Promise<{ pub: string; priv: string }> => {
  const ec = new EC.ec('p256');
  const key = ec.keyFromPrivate(hashHex);
  const pubPoint = key.getPublic();
  const pubHex = pubPoint.encode('hex', false);
  const pubX = arrayBufToBase64UrlEncode(hexToArrayBuf(pubHex).slice(1, 33));
  const pubY = arrayBufToBase64UrlEncode(hexToArrayBuf(pubHex).slice(33, 66));
  return {
    priv: arrayBufToBase64UrlEncode(Buffer.from(hashHex, 'hex')),
    pub: `${pubX}.${pubY}`,
  };
};

export const generateZkIdentityFromHex = async (hashHex: string): Promise<ZkIdentity> => {
  return new ZkIdentity(Strategy.MESSAGE, hashHex);
};

export const generateECDHKeyPairFromhex = async (
  hashHex: string
): Promise<{ pub: string; priv: string }> => {
  const ec = new EC.ec('curve25519');
  const key = ec.keyFromPrivate(hashHex);
  const pubhex = key.getPublic().encodeCompressed('hex');
  const privhex = key.getPrivate().toString('hex');

  return {
    priv: privhex,
    pub: pubhex,
  };
};
