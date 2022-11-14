import Web3 from 'web3';

import { ensResolverABI } from './abi';
import config from './config';

const { default: ENS, getEnsAddress } = require('@ensdomains/ensjs');

const httpProvider = new Web3.providers.HttpProvider(config.web3HttpProvider);

export const defaultWeb3 = new Web3(httpProvider);
export const resolver = new defaultWeb3.eth.Contract(ensResolverABI as any, config.ensResolver);
export const defaultENS = new ENS({
  provider: httpProvider,
  ensAddress: getEnsAddress('1'),
});

const cachedName: any = {};
export const fetchNameByAddress = async (address: string) => {
  if (typeof cachedName[address] !== 'undefined') {
    return cachedName[address];
  }

  const { name } = await defaultENS.getName();

  if (name) {
    cachedName[address] = name || null;
  }

  return name;
};

export const fetchAddressByName = async (ens: string) => {
  if (typeof cachedName[ens] !== 'undefined') {
    return cachedName[ens];
  }
  const address = await defaultENS.name(ens).getAddress();

  if (address) {
    cachedName[ens] = address || null;
  }

  return address;
};
