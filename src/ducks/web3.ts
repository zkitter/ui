import Web3 from 'web3';
import { useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { AppRootState } from '../store/configureAppStore';
import { ThunkDispatch } from 'redux-thunk';
import { Dispatch } from 'redux';
import { generateGunKeyPairFromHex, generateZkIdentityFromHex } from '~/crypto';
import { defaultWeb3, fetchNameByAddress } from '~/web3';
import gun, { authenticateGun } from '~/gun';
import config from '~/config';
import { getUser } from './users';
import { getIdentityHash } from '~/arb3';
import { postWorkerMessage } from '~/sw';
import { setIdentity } from '../serviceWorkers/util';
import { findProof } from '~/merkle';
import { connectWalletConnect } from '~/walletconnect';
import detectEthereumProvider from '@metamask/detect-provider';
import { getCoinbaseProvider } from '~/coinbaseWallet';

enum ActionTypes {
  SET_LOADING = 'web3/setLoading',
  SET_UNLOCKING = 'web3/setUnlocking',
  SET_FETCHING_ENS = 'web3/setFetchingENS',
  SET_WEB3 = 'web3/setWeb3',
  SET_ACCOUNT = 'web3/setAccount',
  SET_JOINED_TX = 'web3/setJoinedTx',
  SET_NETWORK = 'web3/setNetwork',
  SET_ENS_NAME = 'web3/setEnsName',
  SET_SOCIAL_KEY = 'web3/setSocialKey',
  SET_GUN_PRIVATE_KEY = 'web3/setGunPrivateKey',
  SET_SEMAPHORE_ID = 'web3/setSemaphoreID',
  SET_SEMAPHORE_ID_PATH = 'web3/setSemaphoreIDPath',
  ADD_PENDING = 'web3/addPending',
  SET_CREATE_RECORD_TX = 'web3/createRecordTx',
}

type Action = {
  type: ActionTypes;
  payload?: any;
  meta?: any;
  error?: boolean;
};

type State = {
  web3: Web3 | null;
  account: string;
  networkType: string;
  ensName: string;
  loading: boolean;
  fetchingENS: boolean;
  unlocking: boolean;
  gun: {
    pub: string;
    priv: string;
    nonce: number;
    joinedTx: string;
  };
  semaphore: {
    nonce: number;
    keypair: {
      pubKey: string;
      privKey: Buffer | null;
    };
    commitment: BigInt | null;
    identityNullifier: BigInt | null;
    identityTrapdoor: BigInt | null;
    identityPath: {
      element: string;
      path_elements: string[];
      path_index: number[];
      root: string;
    } | null;
  };
  pending: {
    createRecordTx: {
      [address: string]: string;
    };
  };
};

export const initialState: State = {
  web3: null,
  account: '',
  networkType: '',
  ensName: '',
  loading: false,
  fetchingENS: false,
  unlocking: false,
  gun: {
    pub: '',
    priv: '',
    nonce: 0,
    joinedTx: '',
  },
  semaphore: {
    nonce: 0,
    keypair: {
      pubKey: '',
      privKey: null,
    },
    commitment: null,
    identityNullifier: null,
    identityTrapdoor: null,
    identityPath: null,
  },
  pending: {
    createRecordTx: {},
  },
};

export const connectWC = () => async (dispatch: ThunkDispatch<any, any, any>) => {
  dispatch({
    type: ActionTypes.SET_LOADING,
    payload: true,
  });

  try {
    const provider = await connectWalletConnect({
      onSessionEvent: evt => console.log(evt),
      onSessionDelete: () => localStorage.setItem('WC_CACHED', ''),
    });
    const web3 = new Web3(provider);
    const accounts = await web3.eth.requestAccounts();

    if (!accounts.length) {
      throw new Error('No accounts found');
    }

    await dispatch(setWeb3(web3, accounts[0]));

    localStorage.setItem('WC_CACHED', '1');
    localStorage.setItem('CB_CACHED', '');
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

export const connectWeb3 = () => async (dispatch: ThunkDispatch<any, any, any>) => {
  dispatch({
    type: ActionTypes.SET_LOADING,
    payload: true,
  });

  try {
    const provider = await detectEthereumProvider();
    // @ts-expect-error
    const web3 = new Web3(provider);
    const accounts = await web3.eth.requestAccounts();

    if (!accounts.length) {
      throw new Error('No accounts found');
    }

    await dispatch(setWeb3(web3, accounts[0]));
    localStorage.setItem('METAMASK_CACHED', '1');
    localStorage.setItem('CB_CACHED', '');
    localStorage.setItem('WC_CACHED', '');
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

export const setWeb3Loading = (status: boolean) => ({
  type: ActionTypes.SET_LOADING,
  payload: status,
});

export const setUnlocking = (status: boolean) => ({
  type: ActionTypes.SET_UNLOCKING,
  payload: status,
});

export const setJoinedTx = (joinedTx: string) => ({
  type: ActionTypes.SET_JOINED_TX,
  payload: joinedTx,
});

export const setFetchingENS = (status: boolean) => ({
  type: ActionTypes.SET_FETCHING_ENS,
  payload: status,
});

export const setENSName = (name: string) => ({
  type: ActionTypes.SET_ENS_NAME,
  payload: name,
});

export const createRecordTx = (txHash: string) => ({
  type: ActionTypes.SET_CREATE_RECORD_TX,
  payload: txHash,
});

export const setAccount = (account: string) => ({
  type: ActionTypes.SET_ACCOUNT,
  payload: account,
});

export const setNetwork = (network: string) => ({
  type: ActionTypes.SET_NETWORK,
  payload: network,
});

export const setGunPublicKey = (publicKey: string) => ({
  type: ActionTypes.SET_SOCIAL_KEY,
  payload: publicKey,
});

export const setGunPrivateKey = (privateKey: string) => ({
  type: ActionTypes.SET_GUN_PRIVATE_KEY,
  payload: privateKey,
});

export const setSemaphoreID = (identity: {
  commitment: BigInt | null;
  identityNullifier: BigInt | null;
  identityTrapdoor: BigInt | null;
}) => ({
  type: ActionTypes.SET_SEMAPHORE_ID,
  payload: identity,
});

export const setSemaphoreIDPath = (path: any) => ({
  type: ActionTypes.SET_SEMAPHORE_ID_PATH,
  payload: path,
});

export const fetchJoinedTx =
  (account: string) =>
  async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const user: any = await dispatch(getUser(account));

    if (user?.joinedTx) {
      dispatch(setJoinedTx(user.joinedTx));
    }
  };

export const disconnectWeb3 = () => async (dispatch: ThunkDispatch<any, any, any>) => {
  dispatch(reset());
};

const reset = () => async (dispatch: Dispatch) => {
  dispatch(setAccount(''));
  dispatch(setNetwork(''));
  dispatch(setENSName(''));
  dispatch(setJoinedTx(''));
  dispatch(setGunPublicKey(''));
  dispatch(setGunPrivateKey(''));
  dispatch(
    setSemaphoreID({
      identityNullifier: null,
      identityTrapdoor: null,
      commitment: null,
    })
  );
};

const refreshAccount =
  () => async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const {
      web3: { web3 },
    } = getState();

    if (!web3) {
      dispatch(reset());
      return;
    }

    const [account] = await web3.eth.getAccounts();

    if (account) {
      dispatch(setAccount(account));
      await dispatch(fetchJoinedTx(account));
      await dispatch(lookupENS());
    }
  };

export const setWeb3 =
  (web3: Web3 | null, account: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
    dispatch({
      type: ActionTypes.SET_WEB3,
      payload: web3,
    });

    if (!web3) {
      dispatch(reset());
      return;
    }

    const networkType = await web3.eth.net.getNetworkType();

    await dispatch(refreshAccount());
    dispatch(setNetwork(networkType));

    // @ts-ignore
    web3.currentProvider.on('accountsChanged', async ([acct]) => {
      dispatch(reset());
      dispatch(setWeb3Loading(true));
      const gunUser = gun.user();

      // @ts-ignore
      if (gunUser.is) {
        gunUser.leave();
      }

      await dispatch(refreshAccount());
      dispatch(setWeb3Loading(false));
    });

    // @ts-ignore
    web3.currentProvider.on('chainChanged', async () => {
      const networkType = await web3.eth.net.getNetworkType();
      dispatch(setNetwork(networkType));
    });
  };

export const loginGun =
  (nonce = 0) =>
  async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    dispatch(setUnlocking(true));
    const {
      web3: { account },
    } = getState();

    try {
      const result: any = await dispatch(generateGunKeyPair(nonce));
      await postWorkerMessage(
        setIdentity({
          type: 'gun',
          address: account,
          publicKey: result.pub,
          privateKey: result.priv,
          nonce: nonce,
        })
      );
      authenticateGun(result as any);
      dispatch(setUnlocking(false));
      return result;
    } catch (e) {
      dispatch(setUnlocking(false));
      throw e;
    }
  };

export const genSemaphore =
  (web2Provider: 'Twitter' | 'Github' | 'Reddit' = 'Twitter', reputation: string) =>
  async (
    dispatch: ThunkDispatch<any, any, any>,
    getState: () => AppRootState
  ): Promise<boolean> => {
    dispatch(setUnlocking(true));

    try {
      const nonce = 0;
      const {
        web3: { account },
      } = getState();
      const result: any = await dispatch(generateSemaphoreID(web2Provider, nonce));
      const commitment = await result.genIdentityCommitment();

      const data = await findProof(
        `interrep_${web2Provider.toLowerCase()}_${reputation}`,
        commitment.toString(16)
      ).catch(() => undefined);
      const [protocol, groupType, groupName] = (data?.group || '').split('_');

      postWorkerMessage(
        setIdentity({
          type: 'interrep',
          address: account,
          nonce: nonce,
          provider: groupType || web2Provider.toLowerCase(),
          name: groupName || reputation,
          identityPath: data
            ? {
                path_elements: data?.siblings,
                path_index: data?.siblings,
                root: data?.root,
              }
            : null,
          identityCommitment: commitment.toString(),
          serializedIdentity: result.serializeIdentity(),
        })
      );

      dispatch(setUnlocking(false));

      return !!data;
    } catch (e) {
      dispatch(setUnlocking(false));
      throw e;
    }
  };

export const updateIdentity =
  (publicKey: string) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const { web3, account } = state.web3;

    if (!web3 || !account) {
      return Promise.reject(new Error('not connected to web3'));
    }

    const hash = await getIdentityHash(account, publicKey);

    // @ts-ignore
    const proof = await web3.eth.personal.sign(hash, account);

    const resp = await fetch(`${config.indexerAPI}/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account,
        publicKey,
        proof,
      }),
    });

    const json = await resp.json();

    if (resp.status !== 200) {
      throw new Error(json.payload);
    }

    dispatch(createRecordTx(json.payload!.transactionHash!));

    return json;
  };

export const generateGunKeyPair =
  (nonce = 0) =>
  async (
    dispatch: Dispatch,
    getState: () => AppRootState
  ): Promise<{ pub: string; priv: string }> => {
    const state = getState();
    const { web3, account } = state.web3;

    if (!web3 || !account) {
      return Promise.reject(new Error('not connected to web3'));
    }

    // @ts-ignore
    const signedMessage = await web3.eth.personal.sign(
      `Sign this message to generate a GUN key pair with key nonce: ${nonce}`,
      account
    );

    return _generateGunKeyPair(signedMessage);
  };

const _generateGunKeyPair = async (seed: string): Promise<{ pub: string; priv: string }> => {
  const data = new TextEncoder().encode(seed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return await generateGunKeyPairFromHex(hashHex);
};

const generateSemaphoreID =
  (web2Provider: 'Twitter' | 'Reddit' | 'Github' = 'Twitter', nonce = 0) =>
  async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const { web3, account } = state.web3;

    if (!web3 || !account) {
      return Promise.reject(new Error('not connected to web3'));
    }

    // @ts-ignore
    const zkHex = await web3.eth.personal.sign(
      `Sign this message to generate your ${web2Provider} Semaphore identity with key nonce: ${nonce}.`,
      account
    );
    const zkIdentity = await generateZkIdentityFromHex(zkHex);
    return zkIdentity;
  };

export const lookupENS = () => async (dispatch: Dispatch, getState: () => AppRootState) => {
  const state = getState();
  const account = state.web3.account;

  dispatch(setFetchingENS(true));

  if (!account) return;

  try {
    const name = await fetchNameByAddress(account);

    if (name !== '0x0000000000000000000000000000000000000000') {
      dispatch(setENSName(name || ''));
    }

    dispatch(setFetchingENS(false));
  } catch (e) {
    dispatch(setFetchingENS(false));
    throw e;
  }
};

export default function web3(state = initialState, action: Action): State {
  switch (action.type) {
    case ActionTypes.SET_WEB3:
      return {
        ...state,
        web3: action.payload,
      };
    case ActionTypes.SET_ACCOUNT:
      return {
        ...state,
        account: action.payload && defaultWeb3.utils.toChecksumAddress(action.payload),
      };
    case ActionTypes.SET_NETWORK:
      return {
        ...state,
        networkType: action.payload,
      };
    case ActionTypes.SET_ENS_NAME:
      return {
        ...state,
        ensName: action.payload,
      };
    case ActionTypes.SET_SOCIAL_KEY:
      return {
        ...state,
        gun: {
          ...state.gun,
          pub: action.payload,
        },
      };
    case ActionTypes.SET_SEMAPHORE_ID:
      return {
        ...state,
        semaphore: {
          ...state.semaphore,
          keypair: action.payload.keypair,
          commitment: action.payload.commitment,
          identityNullifier: action.payload.identityNullifier,
          identityTrapdoor: action.payload.identityTrapdoor,
        },
      };
    case ActionTypes.SET_SEMAPHORE_ID_PATH:
      return {
        ...state,
        semaphore: {
          ...state.semaphore,
          identityPath: action.payload,
        },
      };
    case ActionTypes.SET_JOINED_TX:
      return {
        ...state,
        gun: {
          ...state.gun,
          joinedTx: action.payload,
        },
      };
    case ActionTypes.SET_FETCHING_ENS:
      return {
        ...state,
        fetchingENS: action.payload,
      };
    case ActionTypes.SET_UNLOCKING:
      return {
        ...state,
        unlocking: action.payload,
      };
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case ActionTypes.SET_CREATE_RECORD_TX:
      return {
        ...state,
        pending: {
          ...state.pending,
          createRecordTx: {
            [state.account]: action.payload,
          },
        },
      };
    case ActionTypes.SET_GUN_PRIVATE_KEY:
      return {
        ...state,
        gun: {
          ...state.gun,
          priv: action.payload,
        },
      };
    case ActionTypes.ADD_PENDING:
      return {
        ...state,
        pending: {
          ...state.pending,
          [action.payload.key]: action.payload.txHash,
        },
      };
    default:
      return state;
  }
}

export const useCanNonPostMessage = () => {
  return useSelector((state: AppRootState) => {
    const {
      worker: { selected },
    } = state;

    if (!selected) return false;

    return !(selected.type === 'interrep' || selected.type === 'zkpr_interrep');
  }, deepEqual);
};

export const useLoggedIn = () => {
  return useSelector((state: AppRootState) => {
    const {
      worker: { selected },
    } = state;

    if (!selected) return false;

    if (selected.type === 'interrep') {
      if (!selected.identityPath || !selected.serializedIdentity) {
        return false;
      }
    }

    return true;
  }, deepEqual);
};

export const useGunLoggedIn = () => {
  return useSelector((state: AppRootState) => {
    const { web3, account, gun } = state.web3;

    const { selected } = state.worker;

    if (selected?.type === 'gun') {
      return true;
    }

    const hasGun = !!gun.priv && !!gun.pub;
    return !!(web3 && account && gun.joinedTx && hasGun);
  }, deepEqual);
};

export const useWeb3Account = () => {
  return useSelector((state: AppRootState) => {
    return state.web3.account;
  }, deepEqual);
};

export const useAccount = (opt?: { uppercase?: boolean }) => {
  return useSelector((state: AppRootState) => {
    const account = state.web3.account;
    const { selected } = state.worker;
    let address = account;

    if (selected) {
      address = selected.address || '';
    }

    if (!address) return '';

    return opt?.uppercase ? `0x${address.slice(-40).toUpperCase()}` : address;
  }, deepEqual);
};

export const useENSName = () => {
  return useSelector((state: AppRootState) => {
    return state.web3.ensName;
  }, deepEqual);
};

export const useWeb3Loading = () => {
  return useSelector((state: AppRootState) => {
    return state.web3.loading;
  }, deepEqual);
};

export const usePendingCreateTx = () => {
  return useSelector((state: AppRootState) => {
    const {
      web3: { account },
    } = state;
    return state.web3.pending.createRecordTx[account];
  }, deepEqual);
};

export const useWeb3Unlocking = () => {
  return useSelector((state: AppRootState) => {
    return state.web3.unlocking;
  }, deepEqual);
};

export const useGunKey = (): State['gun'] => {
  return useSelector((state: AppRootState) => {
    return state.web3.gun;
  }, deepEqual);
};

export const useGunNonce = (): number => {
  return useSelector((state: AppRootState) => {
    return state.web3.gun.nonce;
  }, deepEqual);
};

export const useHasLocal = () => {
  return useSelector((state: AppRootState) => {
    const {
      worker: { identities, selected },
    } = state;

    if (!selected) return false;

    return !!identities.find(id => {
      if (id.type === 'taz' && selected.type === 'taz') {
        return id.identityCommitment === selected.identityCommitment;
      }

      if (id.type === 'interrep' && selected.type === 'interrep') {
        return id.identityCommitment === selected.identityCommitment;
      }

      if (id.type === 'gun' && selected.type === 'gun') {
        return id.address === selected.address;
      }

      return false;
    });
  }, deepEqual);
};
