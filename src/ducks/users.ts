import {Dispatch} from "redux";
import {AppRootState} from "../store/configureAppStore";

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

    const resp = await fetch(`http://localhost:3000/v1/users/${name}`);
    const json = await resp.json();

    dispatch({
        type: ActionTypes.SET_USER,
        payload: json.payload,
    });

    return {
        name: json.payload.name,
        pubkey: json.payload.pubkey,
    };
}

export default function users(state = initialState, action: Action): State {
    switch (action.type) {
        case ActionTypes.SET_USER:
            return {
                ...state,
                [action.payload.name]: {
                    name: action.payload.name,
                    pubkey: action.payload.pubkey,
                },
            };
        default:
            return state;
    }
}