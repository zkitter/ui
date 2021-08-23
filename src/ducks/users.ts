import {Dispatch} from "redux";
import {AppRootState} from "../store/configureAppStore";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
import config from "../util/config";
import {defaultENS} from "../util/web3";
import {setAdmins, setMembers, setSpace} from "./snapshot";

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
    snapshot?: boolean;
}

type State = {
    map: {
        [name: string]: User;
    };
}

const initialState: State = {
    map: {},
};

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
        return fetchPromises[key];
    }

    const fetchPromise = new Promise<User>(async (resolve, reject) => {
        let payload;

        if (cachedUser[key]) {
            payload = cachedUser[key];
        } else {
            const resp = await fetch(`${config.indexerAPI}/v1/users/${ens}`, {
                method: 'GET',
                // @ts-ignore
                headers: {
                    'x-contextual-name': contextualName,
                },
            });
            const json = await resp.json();

            // @ts-ignore
            payload = dispatch(processUserPayload(json.payload));
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
        // @ts-ignore
        const payload = dispatch(processUserPayload(user));
        const key = contextualName + user.ens;
        cachedUser[key] = payload;
        list.push(user.ens);
    }

    return list;
}

const processUserPayload = (user: any) => (dispatch: Dispatch) => {
    // @ts-ignore
    dispatch(fetchAddressByName(user.ens));

    const space = user.snapshotSpace;

    const payload: User = {
        address: '',
        ens: user.ens,
        name: user.name || '',
        pubkey: user.pubkey || '',
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
        snapshot: !!space,
    };

    dispatch({
        type: ActionTypes.SET_USER,
        payload: payload,
    });

    if (space) {
        dispatch(setSpace({
            ens: user.ens,
            about: space.about,
            avatar: space.avatar,
            name: space.name,
            network: space.network,
            strategies: space.strategies,
        }));
        dispatch(setAdmins(user.ens, space.admins));
        dispatch(setMembers(user.ens, space.members));
    }

    return payload;
}

export const setUser = (user: User) => ({
    type: ActionTypes.SET_USER,
    payload: user,
})

export const useUser = (ens = ''): User | null => {
    return useSelector((state: AppRootState) => {
        if (ens === '') {
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

        const user = state.users.map[ens];
        const space = state.snapshot.spaces[ens];

        const val: User = {
            ...user,
            name: user?.name || space?.name || ens,
            bio: user?.bio || space?.about || '',
            profileImage: user?.profileImage || space?.avatar || '',
        };

        return user ? val : null;
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
    const user = state.map[action.payload.name];

    return {
        ...state,
        map: {
            ...state.map,
            [action.payload.name]: {
                ...user,
                ens: action.payload.name,
                address: action.payload.address,
            },
        },
    };
}

function reduceSetUser(state: State, action: Action): State {
    const user = state.map[action.payload.ens];

    return {
        ...state,
        map: {
            ...state.map,
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
                snapshot: action.payload.snapshot,
            },
        },
    };
}