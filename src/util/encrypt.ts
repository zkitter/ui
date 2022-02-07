import CryptoJS from 'crypto-js';

export function encrypt(text: string, password: string): string {
    return CryptoJS.AES.encrypt(text, password).toString();
}

export function decrypt(ciphertext: string, password: string): string {
    const bytes  = CryptoJS.AES.decrypt(ciphertext, password);
    return bytes.toString(CryptoJS.enc.Utf8);
}

export function randomSalt(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
}