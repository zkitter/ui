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
        followerCount: number;
        followingCount: number;
    };
}

type State = {
    [name: string]: User;
}

const initialState: State = {};

const fetchPromises: {
    [name: string]: Promise<any>;
} = {};

export const getUser = (ensName: string) => async (dispatch: Dispatch, getState: () => AppRootState): Promise<User> => {
    if (fetchPromises[ensName]) return fetchPromises[ensName];

    const fetchPromise = new Promise<User>(async (resolve, reject) => {
        const state = getState();
        const users = state.users;
        const user = users[ensName];

        if (user) return user;

        const address = await defaultENS.name(ensName).getAddress();

        const resp = await fetch(`${config.indexerAPI}/v1/users/${ensName}`);
        const json = await resp.json();

        dispatch({
            type: ActionTypes.SET_USER,
            payload: {
                ens: ensName,
                name: json.payload.name,
                pubkey: json.payload.pubkey,
                address,
                bio: json.payload.bio || '',
                profileImage: json.payload.profileImage || '',
                coverImage: json.payload.coverImage || '',
                website: json.payload.website || '',
                joinedAt: json.payload.joinedAt,
                meta: {
                    followerCount: json.payload.meta?.followerCount || 0,
                    followingCount: json.payload.meta?.followingCount || 0,
                },
            },
        });


        const value = {
            ens: ensName,
            name: json.payload.name,
            pubkey: json.payload.pubkey,
            address,
            profileImage: '',
            coverImage: '',
            bio: '',
            website: '',
            meta: {
                followerCount: 0,
                followingCount: 0,
            },
            joinedAt: 0,
        };

        resolve(value);
    });

    fetchPromises[ensName] = fetchPromise;

    return fetchPromise;
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
                    },
                },
            };
        default:
            return state;
    }
}