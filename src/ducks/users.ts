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
                },
            };
        default:
            return state;
    }
}