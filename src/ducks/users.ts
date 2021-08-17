import {Dispatch} from "redux";
import {AppRootState} from "../store/configureAppStore";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
import config from "../util/config";
import {defaultENS} from "../util/web3";

enum ActionTypes {
    SET_USER = 'users/setUser',
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
}

type State = {
    [name: string]: User;
}

const initialState: State = {};

const fetchPromises: any = {};

const cachedUser: any = {};

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
            const address = await defaultENS.name(ens).getAddress();
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
                name: json.payload?.name || ens,
                pubkey: json.payload?.pubkey || '',
                address: address === '0x0000000000000000000000000000000000000000' ? '' : address,
                bio: json.payload?.bio || '',
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
    const list: string[] = [];

    for (const user of json.payload) {
        const address = await defaultENS.name(user.ens).getAddress();
        const payload = {
            ens: user.ens,
            name: user.name || user.ens,
            pubkey: user.pubkey || '',
            address: address === '0x0000000000000000000000000000000000000000' ? '' : address,
            bio: user.bio || '',
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
            return {
                ...state,
                [action.payload.ens]: {
                    ens: action.payload.ens,
                    name: action.payload.name,
                    pubkey: action.payload.pubkey,
                    address: action.payload.address,
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
                },
            };
        default:
            return state;
    }
}