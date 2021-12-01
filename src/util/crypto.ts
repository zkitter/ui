import EC from "elliptic";
import {genPubKey, Identity} from 'libsemaphore';
import {IProof, IWitnessData} from "semaphore-lib/src/index";
import {builder} from "./witness_calculator";
const snarkjs = require('snarkjs');
const { groth16 } = snarkjs;

export const hexToUintArray = (hex: string): Uint8Array => {
    const a = [];
    for (let i = 0, len = hex.length; i < len; i += 2) {
        a.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(a);
}

export const hexToArrayBuf = (hex: string): ArrayBuffer => {
    return hexToUintArray(hex).buffer;
}

export const signWithP256 = (base64PrivateKey: string, data: string) => {
    const buff = base64ToArrayBuffer(base64PrivateKey);
    const hex = Buffer.from(buff).toString('hex');
    const ec = new EC.ec('p256');
    const key = ec.keyFromPrivate(hex);
    const msgHash = Buffer.from(data, 'utf-8').toString('hex');
    const signature = key.sign(msgHash);
    return Buffer.from(signature.toDER()).toString('hex');
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(
        base64.replace(/_/g, '/').replace(/-/g, '+')
    );
    const len = binary_string.length;
    const bytes = new Uint8Array( len );
    for (let i = 0; i < len; i++)        {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export const arrayBufToBase64UrlEncode = (buf: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary)
        .replace(/\//g, '_')
        .replace(/=/g, '')
        .replace(/\+/g, '-');
}

// export const jwkConv = (prvHex: string, pubHex: string) => ({
//     kty: "EC",
//     crv: "P-256",
//     ext: true,
//     x: arrayBufToBase64UrlEncode(hexToArrayBuf(pubHex).slice(1, 33)),
//     y: arrayBufToBase64UrlEncode(hexToArrayBuf(pubHex).slice(33, 66))
// });

export const validateGunPublicKey = async (pub: string) => {
    const x = pub.split('.')[0];
    const y = pub.split('.')[1];

    if (x.length !== 43 || y.length !== 43) {
        return false;
    }

    await crypto.subtle.importKey(
        'jwk',
        {
            kty: "EC",
            crv: "P-256",
            ext: true,
            x: pub.split('.')[0],
            y: pub.split('.')[1],
        },
        {
            name: "ECDSA",
            namedCurve: "P-256",
        },
        true,
        ["verify"]
    );

    return true;
};

export const generateGunKeyPairFromHex = async (hashHex: string): Promise<{pub: string; priv: string}> => {
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
}

export const generateSemaphoreIDFromHex = async (hashHex: string) => {
    const privKey = Buffer.from(hashHex, 'hex');
    const pubKey = genPubKey(privKey);
    const identityNullifierSeed = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(hashHex + 'identity_nullifier'),
    );
    const identityTrapdoorSeed = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(hashHex + 'identity_trapdoor'),
    );

    const identityNullifierSeedBuf = Buffer.from(identityNullifierSeed);
    const identityTrapdoorSeedBuf = Buffer.from(identityTrapdoorSeed);

    return {
        keypair: {
            pubKey,
            privKey,
        },
        identityNullifier: snarkjs.bigInt.leBuff2int(identityNullifierSeedBuf.slice(0, 31)),
        identityTrapdoor: snarkjs.bigInt.leBuff2int(identityTrapdoorSeedBuf.slice(0, 31)),
    }
}


export const genWnts = async(input: any, wasmFilePath: string): Promise<Uint8Array> => {
    const resp = await fetch(wasmFilePath);
    const buffer = await resp.arrayBuffer();

    return new Promise((resolve, reject) => {
        builder(buffer)
            .then(async witnessCalculator => {
                const buff= await witnessCalculator.calculateWTNSBin(input, 0);
                resolve(buff);
            }).catch((error) => {
            reject(error);
        });
    })
}

export const genSemaphoreProof = async(grothInput: any, wasmFilePath: string, finalZkeyPath: string) => {
    const wntsBuff = await genWnts(grothInput, wasmFilePath);
    const resp = await fetch(finalZkeyPath);
    const arrayBuffer = await resp.arrayBuffer();
    const { proof, publicSignals } = await groth16.prove(new Uint8Array(arrayBuffer), wntsBuff, null);
    return { proof, publicSignals };
}