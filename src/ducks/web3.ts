import Web3 from "web3";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
import {AppRootState} from "../store/configureAppStore";
import {Subscription} from "web3-core-subscriptions";
import { genIdentityCommitment, Identity } from 'libsemaphore';
import {ThunkDispatch} from "redux-thunk";
const {
    default: ENS,
    getEnsAddress,
} = require('@ensdomains/ensjs');
import {Dispatch} from "redux";
import Web3Modal from "web3modal";
import {generateGunKeyPairFromHex, generateSemaphoreIDFromHex, validateGunPublicKey} from "../util/crypto";
import {defaultENS, defaultWeb3} from "../util/web3";
import {authenticateGun} from "../util/gun";

export const web3Modal = new Web3Modal({
    network: "main", // optional
    cacheProvider: true, // optional
    // providerOptions: {
    // },
});

enum ActionTypes {
    SET_LOADING = 'web3/setLoading',
    SET_UNLOCKING = 'web3/setUnlocking',
    SET_FETCHING_ENS = 'web3/setFetchingENS',
    SET_WEB3 = 'web3/setWeb3',
    SET_ACCOUNT = 'web3/setAccount',
    SET_NETWORK = 'web3/setNetwork',
    SET_ENS_NAME = 'web3/setEnsName',
    SET_SOCIAL_KEY = 'web3/setSocialKey',
    SET_GUN_PRIVATE_KEY = 'web3/setGunPrivateKey',
    SET_SEMAPHORE_ID = 'web3/setSemaphoreID',
}

type Action = {
    type: ActionTypes;
    payload?: any;
    meta?: any;
    error?: boolean;
}

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
    },
    semaphore: {
        keypair: {
          pubKey: string,
          privKey: Uint8Array|null,
        },
        commitment: string;
        identityNullifier: string;
        identityTrapdoor: string;
    };
}

const initialState: State = {
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
    },
    semaphore: {
        keypair: {
          pubKey: '',
          privKey: null,
        },
        commitment: '',
        identityNullifier: '',
        identityTrapdoor: '',
    },
};

let event: Subscription<any> | null;

export const connectWeb3 = () => async (dispatch: ThunkDispatch<any, any, any>) => {
    dispatch({
        type: ActionTypes.SET_LOADING,
        payload: true,
    });

    try {
        await web3Modal.clearCachedProvider();
        const provider = await web3Modal.connect();
        const web3 = new Web3(provider);
        const accounts = await web3.eth.requestAccounts();

        if (!accounts.length) {
            throw new Error('No accounts found');
        }

        await dispatch(setWeb3(web3, accounts[0]));
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
}

export const setWeb3Loading = (status: boolean) => ({
    type: ActionTypes.SET_LOADING,
    payload: status,
});

export const setUnlocking = (status: boolean) => ({
    type: ActionTypes.SET_UNLOCKING,
    payload: status,
});

export const setFetchingENS = (status: boolean) => ({
    type: ActionTypes.SET_FETCHING_ENS,
    payload: status,
});

export const setENSName = (name: string) => ({
    type: ActionTypes.SET_ENS_NAME,
    payload: name,
});

export const setAccount = (account: string) => ({
    type: ActionTypes.SET_ACCOUNT,
    payload: account,
});

export const setNetwork = (network: string) => ({
    type: ActionTypes.SET_NETWORK,
    payload: network,
});

export const setGunPrivateKey = (privateKey: string) => ({
    type: ActionTypes.SET_GUN_PRIVATE_KEY,
    payload: privateKey,
});

export const setSemaphoreID = (identity: Identity) => ({
    type: ActionTypes.SET_SEMAPHORE_ID,
    payload: identity,
})

export const setWeb3 = (web3: Web3 | null, account: string) => async (
    dispatch: ThunkDispatch<any, any, any>,
) => {
    // if (event) {
    //     await event.unsubscribe((err, result) => {
    //         console.log('unsubscribed');
    //     });
    //     event = null;
    // }

    dispatch(setAccount(account));

    dispatch({
        type: ActionTypes.SET_WEB3,
        payload: web3,
    });

    if (!web3) {
        dispatch(setAccount(''));
        dispatch(setNetwork(''));
        dispatch(setENSName(''));
        return;
    }

    // event = web3.eth.subscribe('newBlockHeaders', async (err, result) => {
    //     if (!err) {
    //         await dispatch(lookupENS());
    //     }
    // });

    const networkType = await web3.eth.net.getNetworkType();

    dispatch(lookupENS());

    dispatch({
        type: ActionTypes.SET_NETWORK,
        payload: networkType,
    });

    // @ts-ignore
    web3.currentProvider.on('accountsChanged', async ([account]) => {
        dispatch(setWeb3Loading(true));
        dispatch(setAccount(account));
        await dispatch(lookupENS());
        dispatch(setWeb3Loading(false));
    });

    // @ts-ignore
    web3.currentProvider.on('networkChanged', async () => {
        const networkType = await web3.eth.net.getNetworkType();
        dispatch({
            type: ActionTypes.SET_NETWORK,
            payload: networkType,
        });
    });
}

export const genENS = () => async (dispatch: ThunkDispatch<any, any, any>) => {
    dispatch(setUnlocking(true));

    try {
        const result: any = await dispatch(generateGunKeyPair(0));
        authenticateGun(result as any);
        dispatch(setGunPrivateKey(result.priv));
        dispatch(setUnlocking(false));
    } catch (e) {
        dispatch(setUnlocking(false));
        throw e;
    }
}

export const genSemaphore = () => async (dispatch: ThunkDispatch<any, any, any>) => {
    dispatch(setUnlocking(true));

    try {
        const result: any = await dispatch(generateSemaphoreID(0));
        dispatch(setSemaphoreID(result as Identity));
        dispatch(setUnlocking(false));
    } catch (e) {
        dispatch(setUnlocking(false));
        throw e;
    }
}

export const addGunKeyToTextRecord = (pubkey: string) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const { web3, account, ensName } = state.web3;

    if (!web3 || !account) {
        return Promise.reject(new Error('not connected to web3'));
    }

    if (!ensName) {
        return Promise.reject(new Error('no ens name'));
    }

    const ens = new ENS({
        provider: web3.currentProvider,
        ensAddress: getEnsAddress('1'),
    });

    return ens.name(ensName).setText('gun.social', pubkey);
}

export const generateGunKeyPair = (nonce = 0) =>
    async (dispatch: Dispatch, getState: () => AppRootState): Promise<{pub: string; priv: string}> =>
{
    const state = getState();
    const { web3, account } = state.web3;

    if (!web3 || !account) {
        return Promise.reject(new Error('not connected to web3'));
    }

    // @ts-ignore
    const signedMessage = await web3.eth.personal.sign(
        `Sign this message to generate a GUN key pair with key nonce: ${nonce}`,
        account,
    );

    return _generateGunKeyPair(signedMessage);
}

const _generateGunKeyPair = async (seed: string): Promise<{pub: string; priv: string}> => {
    const data = new TextEncoder().encode(seed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const pair = await generateGunKeyPairFromHex(hashHex);
    return pair;
}

const generateSemaphoreID = (nonce = 0) => async (
    dispatch: Dispatch, getState: () => AppRootState,
) => {
    const state = getState();
    const { web3, account } = state.web3;

    if (!web3 || !account) {
        return Promise.reject(new Error('not connected to web3'));
    }

    // @ts-ignore
    const signedMessage = await web3.eth.personal.sign(
        `Sign this message to generate a Semaphore identity with key nonce: ${nonce}`,
        account,
    );

    const data = new TextEncoder().encode(signedMessage);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const identity = await generateSemaphoreIDFromHex(Buffer.from(hashBuffer).toString('hex'));
    return identity;
}

export const lookupENS = () => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const account = state.web3.account;

    dispatch(setFetchingENS(true));

    if (!account) return;

    try {
        const {name} = await defaultENS.getName(account);

        if (name) {
            const text = await defaultENS.name(name).getText('gun.social');

            if (await validateGunPublicKey(text)) {
                dispatch({
                    type: ActionTypes.SET_SOCIAL_KEY,
                    payload: text,
                });
            }

        }

        dispatch(setENSName(name || ''));
        dispatch(setFetchingENS(false));
    } catch (e) {
        dispatch(setFetchingENS(false));
        throw e;
    }
}

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
                    keypair: action.payload.keypair,
                    commitment: genIdentityCommitment(action.payload),
                    identityNullifier: action.payload.identityNullifier,
                    identityTrapdoor: action.payload.identityTrapdoor,
                },
            }
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
        case ActionTypes.SET_GUN_PRIVATE_KEY:
            return {
                ...state,
                gun: {
                    ...state.gun,
                    priv: action.payload,
                },
            };
        default:
            return state;
    }
}

export const useWeb3 = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.web3;
    }, deepEqual);
}

export const useLoggedIn = () => {
    return useSelector((state: AppRootState) => {
        const {
            web3,
            account,
            gun,
            semaphore,
        } = state.web3;

        return !!(web3 && account && (gun.priv || semaphore.keypair.privKey));
    }, deepEqual);
}

export const useAccount = (opt?: { uppercase?: boolean }) => {
    return useSelector((state: AppRootState) => {
        const account = state.web3.account;

        if (!account) return '';

        return opt?.uppercase
            ? `0x${state.web3.account.slice(-40).toUpperCase()}`
            : state.web3.account;
    }, deepEqual);
}

export const useENSName = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.ensName;
    }, deepEqual);
}

export const useWeb3Loading = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.loading;
    }, deepEqual);
}

export const useWeb3Unlocking = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.unlocking;
    }, deepEqual);
}

export const useENSFetching = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.fetchingENS;
    }, deepEqual);
}

export const useGunKey = (): { pub: string; priv: string } => {
    return useSelector((state: AppRootState) => {
        return state.web3.gun;
    }, deepEqual);
}

export const useNetworkType = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.networkType;
    }, deepEqual);
}