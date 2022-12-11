import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import config from '~/config';

let cached: CoinbaseWalletSDK | null = null;
export const getCoinbaseWalletSDK = () => {
  if (cached) return cached;
  cached = new CoinbaseWalletSDK({
    appName: 'Zkitter',
  });
  return cached;
};

export const getCoinbaseProvider = () => {
  const provider = getCoinbaseWalletSDK().makeWeb3Provider(config.web3HttpProvider, 1);
  provider.enable();
  return provider;
};

export const disconnectCoinbaseProvider = async () => {
  await getCoinbaseWalletSDK().disconnect();
  localStorage.setItem('CB_CACHED', '');
};
