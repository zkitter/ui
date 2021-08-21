import {Dispatch} from "redux";
import {AppRootState} from "../store/configureAppStore";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
import config from "../util/config";
import {defaultENS} from "../util/web3";

enum ActionTypes {
    SET_USER = 'users/setUser',
    SET_USER_ADDRESS = 'users/setUserAddress',
}

type Action = {
    type: ActionTypes;
    payload?: any;
    meta?: any;
    error?: boolean;
}

export type User = {
    ens: string;
    name: string;
    pubkey: string;
    address: string;
    coverImage: string;
    profileImage: string;
    bio: string;
    website: string;
    joinedAt: number;
    meta: {
        blockedCount: number;
        blockingCount: number;
        followerCount: number;
        followingCount: number;
        followed: string | null;
        blocked: string | null;
    };
    snapshotSpace?: {
        id: string;
        name: string;
        about: string;
        network: string;
        symbol: string;
        avatar: string;
        members: string[];
        admins: string[];
    }
}

type State = {
    [name: string]: User;
}

const initialState: State = {};

const fetchPromises: any = {};

const cachedUser: any = {};

export const fetchAddressByName = (ens: string) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const address = await defaultENS.name(ens).getAddress();
    dispatch({
        type: ActionTypes.SET_USER_ADDRESS,
        payload: {
            name: ens,
            address: address === '0x0000000000000000000000000000000000000000' ? '' : address,
        },
    });
}

export const getUser = (ens: string) => async (dispatch: Dispatch, getState: () => AppRootState): Promise<User> => {
    const {
        web3: {
            ensName,
            gun: { pub, priv },
        },
    } = getState();
    const contextualName = (ensName && pub && priv) ? ensName : undefined;
    const key = contextualName + ens;

    if (fetchPromises[key]) {
        if (cachedUser[key]) {
            dispatch({
                type: ActionTypes.SET_USER,
                payload: cachedUser[key],
            });
        }
        return fetchPromises[key];
    }

    const fetchPromise = new Promise<User>(async (resolve, reject) => {
        let payload;

        if (cachedUser[key]) {
            payload = cachedUser[key];
        } else {
            // @ts-ignore
            dispatch(fetchAddressByName(ens));

            const resp = await fetch(`${config.indexerAPI}/v1/users/${ens}`, {
                method: 'GET',
                // @ts-ignore
                headers: {
                    'x-contextual-name': contextualName,
                },
            });
            const json = await resp.json();

            payload = {
                ens: ens,
                name: json.payload?.name || json.payload?.snapshotSpace?.name || ens,
                pubkey: json.payload?.pubkey || '',
                bio: json.payload?.bio || json.payload?.snapshotSpace?.about || '',
                profileImage: json.payload?.profileImage || '',
                coverImage: json.payload?.coverImage || '',
                website: json.payload?.website || '',
                joinedAt: json.payload?.joinedAt,
                meta: {
                    followerCount: json.payload?.meta?.followerCount || 0,
                    followingCount: json.payload?.meta?.followingCount || 0,
                    blockedCount: json.payload?.meta?.blockedCount || 0,
                    blockingCount: json.payload?.meta?.blockingCount || 0,
                    followed: json.payload?.meta?.followed || null,
                    blocked: json.payload?.meta?.blocked || null,
                },
                snapshotSpace: json.payload?.snapshotSpace,
            };

            cachedUser[key] = payload;
        }

        dispatch({
            type: ActionTypes.SET_USER,
            payload: payload,
        });

        resolve(payload);
    });

    fetchPromises[key] = fetchPromise;

    return fetchPromise;
}

export const fetchUsers = () => async (dispatch: Dispatch, getState: () => AppRootState): Promise<string[]> => {
    const {
        web3: {
            ensName,
            gun: { pub, priv },
        },
    } = getState();
    const contextualName = (ensName && pub && priv) ? ensName : undefined;
    const resp = await fetch(`${config.indexerAPI}/v1/users?limit=10`, {
        method: 'GET',
        // @ts-ignore
        headers: {
            'x-contextual-name': contextualName,
        },
    });

    const json = await resp.json();

    setTimeout(() => {

    }, 0)
    const list: string[] = [];

    for (const user of json.payload) {
        // @ts-ignore
        dispatch(fetchAddressByName(user.ens));
        const payload = {
            ens: user.ens,
            name: user.name || json.payload?.snapshotSpace?.name || user.ens,
            pubkey: user.pubkey || '',
            bio: user.bio || json.payload?.snapshotSpace?.about || '',
            profileImage: user.profileImage || '',
            coverImage: user.coverImage || '',
            website: user.website || '',
            joinedAt: user.joinedAt,
            meta: {
                followerCount: user.meta?.followerCount || 0,
                followingCount: user.meta?.followingCount || 0,
                blockedCount: user.meta?.blockedCount || 0,
                blockingCount: user.meta?.blockingCount || 0,
                followed: user.meta?.followed || null,
                blocked: user.meta?.blocked || null,
            },
            snapshotSpace: user.snapshotSpace,
        };

        dispatch({
            type: ActionTypes.SET_USER,
            payload: payload,
        });

        list.push(user.ens);
    }

    return list;
}

export const setUser = (user: User) => ({
    type: ActionTypes.SET_USER,
    payload: user,
})

export const useUser = (name = ''): User | null => {
    return useSelector((state: AppRootState) => {
        if (name === '') {
            return {
                ens: '',
                name: "Anonymous",
                pubkey: '',
                address: '',
                coverImage: '',
                profileImage: '',
                bio: '',
                website: '',
                joinedAt: 0,
                meta: {
                    followerCount: 0,
                    followingCount: 0,
                    blockedCount: 0,
                    blockingCount: 0,
                    followed: null,
                    blocked: null,
                },
            }
        }

        return state.users[name] || null;
    }, deepEqual);
}

export default function users(state = initialState, action: Action): State {
    switch (action.type) {
        case ActionTypes.SET_USER:
            return reduceSetUser(state, action);
        case ActionTypes.SET_USER_ADDRESS:
            return reduceSetUserAddress(state, action);
        default:
            return state;
    }
}

function reduceSetUserAddress(state: State, action: Action): State {
    const user = state[action.payload.name];

    return {
        ...state,
        [action.payload.name]: {
            ...user,
            ens: action.payload.name,
            address: action.payload.address,
        },
    };
}

function reduceSetUser(state: State, action: Action): State {
    const user = state[action.payload.ens];

    return {
        ...state,
        [action.payload.ens]: {
            ...user,
            ens: action.payload.ens,
            name: action.payload.name,
            pubkey: action.payload.pubkey,
            bio: action.payload.bio,
            profileImage: action.payload.profileImage,
            coverImage: action.payload.coverImage,
            website: action.payload.website,
            joinedAt: action.payload.joinedAt,
            meta: {
                followerCount: action.payload.meta?.followerCount || 0,
                followingCount: action.payload.meta?.followingCount || 0,
                blockedCount: action.payload.meta?.blockedCount || 0,
                blockingCount: action.payload.meta?.blockingCount || 0,
                followed: action.payload.meta?.followed || null,
                blocked: action.payload.meta?.blocked || null,
            },
            snapshotSpace: action.payload.snapshotSpace,
        },
    };
}