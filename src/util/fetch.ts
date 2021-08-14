import { genCircuit } from "libsemaphore";

let circuit, provingKey;

export const getCircuit = async () => {
    const response = await fetch('http://localhost:3000/dev/circuit');
    const result = await response.json()
    circuit = genCircuit(result);
    return circuit;
}
export const getProvingKey = async () => {
    const response = await fetch('http://localhost:3000/dev/provingKey');
    const result = await response.arrayBuffer()
    provingKey = new Uint8Array(result);
    return provingKey;
}