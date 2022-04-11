import config from "./config";
import {Identity} from "../serviceWorkers/identity";

type PathData = {
    path: {
        path_elements: BigInt[];
        path_index: number[];
        root: BigInt;
    };
    provider: string;
    name: string;
};

export const checkPath = async (commitment: string): Promise<PathData|null> => {
    const resp = await fetch(`${config.indexerAPI}/interrep/${commitment}`);
    const { payload: {data, name, provider}, error } = await resp.json();

    let path = null;
    let groupName = '';

    if (error) {
        return null;
    }

    if (!error && data) {
        path = {
            path_elements: data.siblings.map((el: string) => BigInt(el)),
            path_index: data.pathIndices as number[],
            root: BigInt(data.root),
        };
        groupName = name as string;

        return {
            path,
            provider: provider as string,
            name: groupName,
        }
    }

    return null;
}

export const watchPath = async (commitment: string): Promise<PathData> => {
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

export const getGroupName = (provider: string, name: string): string => {

    const _provider = provider?.toLowerCase();
    const _name = name?.toLowerCase();

    switch (_provider + '.' + _name) {
        case 'twitter.not_sufficient':
            return 'Someone from Twitter';
        case 'twitter.bronze':
            return 'Someone with 500+ Twitter followers';
        case 'twitter.silver':
            return 'Someone with 2k+ Twitter followers';
        case 'twitter.gold':
            return 'Someone with 7k+ Twitter followers';
        default:
            return provider + ' ' + name;
    }
}