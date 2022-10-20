import Web3 from 'web3';
import config from './config';
import { arbRegistrarABI } from './abi';

const arcHttpProvider = new Web3.providers.HttpProvider(config.arbitrumHttpProvider);
export const arb3 = new Web3(arcHttpProvider);
export const hashPubKey = (account: string, pubkeyBytes: string, nonce: string) => {
  return Web3.utils.keccak256(Web3.utils.encodePacked(account, pubkeyBytes, nonce)!);
};
export const getIdentityHash = async (account: string, publicKey: string) => {
  const contract = new arb3.eth.Contract(arbRegistrarABI as any, config.arbitrumRegistrar);
  const pubkeyBytes = Web3.utils.utf8ToHex(publicKey);
  const nonce = await contract.methods.nonces(account).call();
  return hashPubKey(account, pubkeyBytes, nonce)!;
};
export const getTransactionReceipt = async (txHash: string) => {
  return await arb3.eth.getTransactionReceipt(txHash);
};

export const TXRejectError = new Error(`Transaction rejected by EVM`);
export const TXTooLongError = new Error(`Transaction take too long`);

export const watchTx = async (txHash: string) => {
  let count = 0;
  return new Promise(async (resolve, reject) => {
    _watchTx(txHash);

    async function _watchTx(txHash: string) {
      count++;
      const receipt = await getTransactionReceipt(txHash);

      if (receipt) {
        if (receipt.status) {
          resolve(receipt);
        } else {
          reject(TXRejectError);
        }

        return;
      }

      if (count > 12) {
        reject(TXTooLongError);
      }

      setTimeout(() => _watchTx(txHash), 5000);
    }
  });
};
