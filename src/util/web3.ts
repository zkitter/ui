const {
    default: ENS,
    getEnsAddress,
} = require('@ensdomains/ensjs');
import Web3 from "web3";
import config from "./config";
import {ensResolverABI} from "./abi";

const httpProvider = new Web3.providers.HttpProvider(config.web3HttpProvider);
export const defaultWeb3 = new Web3(httpProvider);
export const resolver = new defaultWeb3.eth.Contract(
    ensResolverABI as any,
    config.ensResolver,
);
export const defaultENS = new ENS({
    provider: httpProvider,
    ensAddress: getEnsAddress('1'),
});

const cachedName: any = {};
export const fetchNameByAddress = async (address: string) => {
    if (typeof cachedName[address] !== 'undefined') {
        return cachedName[address];
    }

    const {name} = await defaultENS.getName(address);
    cachedName[address] = name || null;
    return name;
}