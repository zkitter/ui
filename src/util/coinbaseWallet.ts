import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import config from '~/config';
import { ThunkDispatch } from 'redux-thunk';
import Web3 from 'web3';
import { ActionTypes, setWeb3 } from '@ducks/web3';

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

export const connectCB = () => async (dispatch: ThunkDispatch<any, any, any>) => {
  dispatch({
    type: ActionTypes.SET_LOADING,
    payload: true,
  });

  try {
    const provider = getCoinbaseProvider();
    const web3 = new Web3(provider);
    const accounts = await web3.eth.requestAccounts();

    if (!accounts.length) {
      throw new Error('No accounts found');
    }

    await dispatch(setWeb3(web3, accounts[0]));

    localStorage.setItem('CB_CACHED', '1');
    localStorage.setItem('WC_CACHED', '');
    localStorage.setItem('METAMASK_CACHED', '');
    dispatch({
      type: ActionTypes.SET_LOADING,
      payload: false,
    });
  } catch (e) {
    dispatch({
      type: ActionTypes.SET_LOADING,
      payload: false,
    });
    throw e;
  }
};

export const disconnectCoinbaseProvider = async () => {
  if (localStorage.getItem('CB_CACHED') === '1') {
    await getCoinbaseWalletSDK().disconnect();
    localStorage.setItem('CB_CACHED', '');
  }
};
