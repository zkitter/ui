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
    name: string;
    pubkey: string;
    address: string;
    coverImage: string;
    profileImage: string;
    bio: string;
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

export const getUser = (name: string) => async (dispatch: Dispatch, getState: () => AppRootState): Promise<User> => {
    const state = getState();
    const users = state.users;
    const user = users[name];

    if (user) return user;

    const address = await defaultENS.name(name).getAddress();

    const resp = await fetch(`${config.indexerAPI}/v1/users/${name}`);
    const json = await resp.json();

    dispatch({
        type: ActionTypes.SET_USER,
        payload: {
            name: json.payload.name,
            pubkey: json.payload.pubkey,
            address,
        },
    });

    return {
        name: json.payload.name,
        pubkey: json.payload.pubkey,
        address,
        profileImage: '',
        coverImage: '',
        bio: '',
        meta: {
            followerCount: 0,
            followingCount: 0,
        },
        joinedAt: 0,
    };
}

export const useUser = (name = ''): User | null => {
    return useSelector((state: AppRootState) => {
        return state.users[name] || null;
    }, deepEqual);
}

export default function users(state = initialState, action: Action): State {
    switch (action.type) {
        case ActionTypes.SET_USER:
            return {
                ...state,
                [action.payload.name]: {
                    name: action.payload.name,
                    pubkey: action.payload.pubkey,
                    address: action.payload.address,
                    bio: action.payload.bio,
                    profileImage: action.payload.profileImage,
                    coverImage: action.payload.coverImage,
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