import Web3 from "web3";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
import {AppRootState} from "../store/configureAppStore";
import {Subscription} from "web3-core-subscriptions";
import {Identity } from 'libsemaphore';
import {
    OrdinarySemaphore,
} from "semaphore-lib";
import {ThunkDispatch} from "redux-thunk";
const {
    default: ENS,
    getEnsAddress,
} = require('@ensdomains/ensjs');
import {Dispatch} from "redux";
import Web3Modal from "web3modal";
import {
    generateGunKeyPairFromHex,
    validateGunPublicKey,
} from "../util/crypto";
import {defaultENS, defaultWeb3} from "../util/web3";
import gun, {authenticateGun} from "../util/gun";
import semethid from "@interrep/semethid";
import config from "../util/config";
import {getUser, User} from "./users";
import {getIdentityHash, hashPubKey} from "../util/arb3";
OrdinarySemaphore.setHasher('poseidon');

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
        nonce: number;
        joinedTx: string;
    },
    semaphore: {
        nonce: number;
        keypair: {
          pubKey: string;
          privKey: Buffer|null;
        },
        commitment: BigInt|null;
        identityNullifier: BigInt|null;
        identityTrapdoor: BigInt|null;
        identityPath: {
            element: string;
            path_elements: string[];
            path_index: number[];
            root: string;
        } | null;
    };
    pending: {
        createRecordTx: string;
    }
}

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
        createRecordTx: '',
    },
};

let event: Subscription<any> | null;

export const UserNotExistError = new Error('user not exist');

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

export const setJoinedTx = (joinedTx: string) => ({
    type: ActionTypes.SET_JOINED_TX,
    payload: joinedTx,
});

export const setFetchingENS = (status: boolean) => ({
    type: ActionTypes.SET_FETCHING_ENS,
    payload: status,
});

export const setPendingTx = (txHash: string, key = '') => ({
    type: ActionTypes.ADD_PENDING,
    payload: {
        key: key || txHash,
        txHash,
    },
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
    keypair: {
        pubKey: string,
        privKey: Buffer|null,
    },
    commitment: BigInt|null;
    identityNullifier: BigInt|null;
    identityTrapdoor: BigInt|null;
}) => ({
    type: ActionTypes.SET_SEMAPHORE_ID,
    payload: identity,
})

export const setSemaphoreIDPath = (path: any) => ({
    type: ActionTypes.SET_SEMAPHORE_ID_PATH,
    payload: path,
});

export const fetchJoinedTx = (account: string) => async (
    dispatch: ThunkDispatch<any, any, any>,
    getState: () => AppRootState,
) => {
    const user: any = await dispatch(getUser(account));

    if (user?.joinedTx) {
        dispatch(setJoinedTx(user.joinedTx));
    }
}

export const setWeb3 = (web3: Web3 | null, account: string) => async (
    dispatch: ThunkDispatch<any, any, any>,
) => {
    dispatch(fetchJoinedTx(account))
    dispatch(setAccount(account));

    dispatch({
        type: ActionTypes.SET_WEB3,
        payload: web3,
    });

    if (!web3) {
        dispatch(setAccount(''));
        dispatch(setNetwork(''));
        dispatch(setENSName(''));
        dispatch(setJoinedTx(''));
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
    web3.currentProvider.on('accountsChanged', async ([acct]) => {
        const account = Web3.utils.toChecksumAddress(acct);
        dispatch(setGunPublicKey(''));
        dispatch(dispatch(setJoinedTx('')));
        dispatch(setGunPrivateKey(''));
        dispatch(setSemaphoreID({
            keypair: {
                pubKey: '',
                privKey: null,
            },
            identityNullifier: null,
            identityTrapdoor: null,
            commitment: null,
        }));
        dispatch(setWeb3Loading(true));
        const gunUser = gun.user();
        // @ts-ignore
        if (gunUser.is) {
            gunUser.leave();
        }
        dispatch(setAccount(account));
        const user: any = await dispatch(getUser(account));
        if (user?.joinedTx) {
            dispatch(setJoinedTx(user.joinedTx));
        }
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

export const loginGun = (nonce = 0) => async (
    dispatch: ThunkDispatch<any, any, any>,
    getState: () => AppRootState,
) => {
    dispatch(setUnlocking(true));

    try {
        const result: any = await dispatch(generateGunKeyPair(nonce));
        dispatch(setGunPublicKey(result.pub));
        dispatch(setGunPrivateKey(result.priv));
        authenticateGun(result as any);
        dispatch(setUnlocking(false));
        return result;
    } catch (e) {
        dispatch(setUnlocking(false));
        throw e;
    }
}

export const genSemaphore = (web2Provider: 'Twitter' | 'Github' | 'Reddit' = 'Twitter') =>
    async (dispatch: ThunkDispatch<any, any, any>) =>
{
    dispatch(setUnlocking(true));

    try {
        const result: any = await dispatch(generateSemaphoreID(web2Provider, 0));
        const commitment = await OrdinarySemaphore.genIdentityCommitment(result);

        const resp = await fetch(`${config.indexerAPI}/interrep/${commitment.toString()}`);
        const { payload: {data}, error } = await resp.json();

        if (!error && data) {
            const path = {
              path_elements: data.pathElements,
              path_index: data.indices,
            };
            dispatch(setSemaphoreIDPath(path));
        }

        dispatch(setSemaphoreID({
            ...result,
            commitment,
        }));
        dispatch(setUnlocking(false));
    } catch (e) {
        dispatch(setUnlocking(false));
        throw e;
    }
}

export const updateIdentity = (publicKey: string) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const { web3, account } = state.web3;

    if (!web3 || !account) {
        return Promise.reject(new Error('not connected to web3'));
    }

    const hash = await getIdentityHash(account, publicKey);

    // @ts-ignore
    const proof = await web3.eth.personal.sign(
        hash,
        account,
    );

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

    dispatch(createRecordTx(json.payload!.transactionHash!));

    return json;
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

const generateSemaphoreID = (
    web2Provider: 'Twitter' | 'Reddit' | 'Github' = 'Twitter',
    nonce = 0,
) => async (
    dispatch: Dispatch, getState: () => AppRootState,
) => {
    const state = getState();
    const { web3, account } = state.web3;

    if (!web3 || !account) {
        return Promise.reject(new Error('not connected to web3'));
    }

    const identity: Identity = await semethid(
        // @ts-ignore
        (message: string) => web3.eth.personal.sign(message, account),
        web2Provider,
        0,
    );
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

        if (name !== '0x0000000000000000000000000000000000000000') {
            dispatch(setENSName(name || ''));
        }

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
                    ...state.semaphore,
                    keypair: action.payload.keypair,
                    commitment: action.payload.commitment,
                    identityNullifier: action.payload.identityNullifier,
                    identityTrapdoor: action.payload.identityTrapdoor,
                },
            }
        case ActionTypes.SET_SEMAPHORE_ID_PATH:
            return {
                ...state,
                semaphore: {
                    ...state.semaphore,
                    identityPath: action.payload,
                },
            }
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
                    createRecordTx: action.payload,
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

        const hasGun = !!gun.priv && !!gun.pub;
        const hasSemaphore = !!semaphore.keypair.privKey
            && !!semaphore.keypair.pubKey
            && !!semaphore.identityNullifier
            && !!semaphore.identityTrapdoor
            && !!semaphore.commitment
            && !!semaphore.identityPath;

        if (hasSemaphore) return true;

        if (!!(web3 && account && gun.joinedTx && (hasGun))) return true;

        return false;
    }, deepEqual);
}

export const useGunLoggedIn = () => {
    return useSelector((state: AppRootState) => {
        const {
            web3,
            account,
            gun,
        } = state.web3;

        const hasGun = !!gun.priv && !!gun.pub;
        return !!(web3 && account && gun.joinedTx && (hasGun));
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

export const usePendingCreateTx = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.pending.createRecordTx;
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

export const useGunKey = (): State['gun'] => {
    return useSelector((state: AppRootState) => {
        return state.web3.gun;
    }, deepEqual);
}

export const useGunNonce = (): number => {
    return useSelector((state: AppRootState) => {
        return state.web3.gun.nonce;
    }, deepEqual);
}

export const useSemaphoreID = (): State['semaphore'] => {
    return useSelector((state: AppRootState) => {
        return state.web3.semaphore;
    }, deepEqual);
}

export const useSemaphoreNonce = (): number => {
    return useSelector((state: AppRootState) => {
        return state.web3.semaphore.nonce;
    }, deepEqual);
}

export const useNetworkType = () => {
    return useSelector((state: AppRootState) => {
        return state.web3.networkType;
    }, deepEqual);
}