import { genCircuit } from "libsemaphore";
import {local} from "web3modal";

let circuit: any, provingKey: Uint8Array;

export const getCircuit = async () => {
    if (circuit) return circuit;

    const response = await fetch('https://dl.dropboxusercontent.com/s/3gzxjibqgb6ke13/circuit.json?dl=1');
    const result = await response.json()

    circuit = genCircuit(result);
    return circuit;
}
export const getProvingKey = async () => {
    if (provingKey) return provingKey;

    const response = await fetch('https://dl.dropboxusercontent.com/s/qjlu6v125g7jkcq/proving_key.bin?dl=1');
    const result = await response.arrayBuffer()

    provingKey = new Uint8Array(result);
    return provingKey;
}