import Web3 from "web3";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
import {AppRootState} from "../store/configureAppStore";
import {Subscription} from "web3-core-subscriptions";
import {ThunkDispatch} from "redux-thunk";
const {
    default: ENS,
    getEnsAddress,
} = require('@ensdomains/ensjs');
import config from "../util/config";
import {ensResolverABI} from "../util/abi";
import {Dispatch} from "redux";
import Web3Modal from "web3modal";
import {generateGunKeyPairFromHex, validateGunPublicKey} from "../util/crypto";

const web3Modal = new Web3Modal({
    network: "main", // optional
    cacheProvider: true, // optional
    providerOptions: {
    },
});

const httpProvider = new Web3.providers.HttpProvider(config.web3HttpProvider);
const defaultWeb3 = new Web3(httpProvider);
const resolver = new defaultWeb3.eth.Contract(
    ensResolverABI as any,
    config.ensResolver,
);
const defaultENS = new ENS({
    provider: httpProvider,
    ensAddress: getEnsAddress('1'),
});

enum ActionTypes {
    SET_LOADING = 'web3/setLoading',
    SET_WEB3 = 'web3/setWeb3',
    SET_ACCOUNT = 'web3/setAccount',
    SET_NETWORK = 'web3/setNetwork',
    SET_ENS_NAME = 'web3/setEnsName',
    SET_SOCIAL_KEY = 'web3/setSocialKey',
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
    publicKeys: {
        gun: string;
        semaphore: string;
    };
}

const initialState: State = {
    web3: null,
    account: '',
    networkType: '',
    ensName: '',
    loading: false,
    publicKeys: {
        gun: '',
        semaphore: '',
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

export const setWeb3 = (web3: Web3 | null, account: string) => async (
    dispatch: ThunkDispatch<any, any, any>,
) => {
    // if (event) {
    //     await event.unsubscribe((err, result) => {
    //         console.log('unsubscribed');
    //     });
    //     event = null;
    // }


    dispatch({
        type: ActionTypes.SET_ACCOUNT,
        payload: account,
    });

    dispatch({
        type: ActionTypes.SET_WEB3,
        payload: web3,
    });

    if (!web3) {
        dispatch({
            type: ActionTypes.SET_ACCOUNT,
            payload: '',
        });
        dispatch({
            type: ActionTypes.SET_NETWORK,
            payload: '',
        });
        dispatch({
            type: ActionTypes.SET_ENS_NAME,
            payload: '',
        });
        return;
    }

    // event = web3.eth.subscribe('newBlockHeaders', async (err, result) => {
    //     if (!err) {
    //         await dispatch(lookupENS());
    //     }
    // });

    const networkType = await web3.eth.net.getNetworkType();

    await dispatch(lookupENS());

    dispatch({
        type: ActionTypes.SET_NETWORK,
        payload: networkType,
    });

    // @ts-ignore
    web3.currentProvider.on('accountsChanged', async ([account]) => {
        dispatch({
            type: ActionTypes.SET_LOADING,
            payload: true,
        });

        dispatch({
            type: ActionTypes.SET_ACCOUNT,
            payload: account,
        });
        await dispatch(lookupENS());
        dispatch({
            type: ActionTypes.SET_LOADING,
            payload: false,
        });
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

export const lookupENS = () => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const account = state.web3.account;

    if (!account) return;

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

    dispatch({
        type: ActionTypes.SET_ENS_NAME,
        payload: name || '',
    });
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
                publicKeys: {
                    ...state.publicKeys,
                    gun: action.payload,
                },
            };
        case ActionTypes.SET_LOADING:
            return {
                ...state,
                loading: action.payload,
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

export const useGunKey = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.publicKeys.gun;
    }, deepEqual);
}

export const useNetworktype = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.networkType;
    }, deepEqual);
}