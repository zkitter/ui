import Web3 from "web3";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
import {AppRootState} from "../store/configureAppStore";
import {Subscription} from "web3-core-subscriptions";
import {ThunkDispatch} from "redux-thunk";
import EC from "elliptic";
const {
    default: ENS,
    getEnsAddress,
} = require('@ensdomains/ensjs');
import config from "../util/config";
import {ensResolverABI} from "../util/abi";
import {Dispatch} from "redux";
import Web3Modal from "web3modal";

const web3Modal = new Web3Modal({
    network: "main", // optional
    cacheProvider: false, // optional
    providerOptions: {
    },
});

const httpProvider = new Web3.providers.HttpProvider(config.web3HttpProvider);
const defaultWeb3 = new Web3(httpProvider);
const resolver = new defaultWeb3.eth.Contract(
    ensResolverABI as any,
    config.ensResolver,
);
const ens = new ENS({
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
    socialKey: string;
    loading: boolean;
}

const initialState: State = {
    web3: null,
    account: '',
    networkType: '',
    ensName: '',
    socialKey: '',
    loading: false,
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

export const generateSocialKey = () => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const {
        web3,
        account,
    } = state.web3;

    if (!web3 || !account) {
        return Promise.reject(new Error('not connected to web3'));
    }

    const signedMessage = await web3.eth.personal.sign('Sign this message to login to 0xSocial', account);
    const data = new TextEncoder().encode(signedMessage);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string

    const ec = new EC.ec('p256');

    const key = ec.keyFromPrivate(hashHex);

    const pubPoint = key.getPublic();

    const pubkey = pubPoint.encode('hex');

    const hexToUintArray = hex => {
        const a = [];
        for (let i = 0, len = hex.length; i < len; i += 2) {
            a.push(parseInt(hex.substr(i, 2), 16));
        }
        return new Uint8Array(a);
    }

    const hexToArrayBuf = hex => {
        return hexToUintArray(hex).buffer;
    }

    const arrayBufToBase64UrlEncode = buf => {
        let binary = '';
        const bytes = new Uint8Array(buf);
        for (var i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary)
            .replace(/\//g, '_')
            .replace(/=/g, '')
            .replace(/\+/g, '-');
    }

    const jwkConv = (prvHex, pubHex) => ({
        kty: "EC",
        crv: "P-256",
        ext: true,
        x: arrayBufToBase64UrlEncode(hexToArrayBuf(pubHex).slice(1, 33)),
        y: arrayBufToBase64UrlEncode(hexToArrayBuf(pubHex).slice(33, 66))
    });

    const publicKey = await crypto.subtle.importKey(
        "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
        jwkConv(hashHex, pubkey),
        {   //these are the algorithm options
            name: "ECDSA",
            namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
        },
        true, //whether the key is extractable (i.e. can be used in exportKey)
        ["verify"] //"verify" for public key import, "sign" for private key imports
    );

    console.log(publicKey)
    const pub = await crypto.subtle.exportKey('jwk', publicKey);
    console.log(Buffer.from(hashHex, 'hex').toString('base64'));
    console.log(pub.x + '.' + pub.y)
}

export const lookupENS = () => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const account = state.web3.account;

    if (!account) return;

    const {name} = await ens.getName(account);

    if (name) {
        const text = await ens.name(name).getText('gun.social');
        dispatch({
            type: ActionTypes.SET_SOCIAL_KEY,
            payload: text,
        });
    }

    dispatch({
        type: ActionTypes.SET_ENS_NAME,
        payload: name || '',
    });
}

export default function web3(state = initialState, action: Action) {
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
                socialKey: action.payload,
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

export const useAccount = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.account;
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

export const useNetworktype = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.networkType;
    }, deepEqual);
}