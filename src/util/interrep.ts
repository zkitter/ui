import config from "./config";
import {getTransactionReceipt, TXRejectError, TXTooLongError} from "./arb3";

export const checkPath = async (commitment: string) => {
    const resp = await fetch(`${config.indexerAPI}/interrep/${commitment}`);
    const { payload: {data, name}, error } = await resp.json();

    let path = null;
    let groupName = '';

    if (error) {
        return null;
    }

    if (!error && data) {
        path = {
            path_elements: data.siblings.map((el: string) => BigInt(el)),
            path_index: data.pathIndices,
            root: BigInt(data.root),
        };
        groupName = name;

        return {
            path,
            name: groupName,
        }
    }
}

export const watchPath = async (commitment: string) => {
    let count = 0;
    return new Promise(async (resolve, reject) => {
        _watchTx();

        async function _watchTx() {
            count++;
            const data = await checkPath(commitment);

            if (data) {
                resolve(data);
                return;
            }

            if (count > 12) {
                reject(new Error('timed out'));
            }

            setTimeout(_watchTx, 5000);
        }
    });
}