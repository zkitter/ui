import {useSelector} from "react-redux";
import {AppRootState} from "../store/configureAppStore";
import deepEqual from "fast-deep-equal";

export enum ActionType {
    SET_SPACE = 'SET_SPACE',
    SET_ADMINS = 'SET_ADMINS',
    SET_MEMBERS = 'SET_MEMBERS',
}

export type Action<payload> = {
    type: ActionType;
    payload: payload;
    meta?: any;
    error?: boolean;
}

export type State = {
    spaces: {
        [ens: string]: Space;
    };
}

export type Space = {
    ens: string;
    name: string;
    about: string;
    network: string;
    avatar: string;
    strategies: Strategy[];
    admins: {
        [address: string]: string;
    };
    members: {
        [address: string]: string;
    };
}

export type Strategy = {
    name: string;
    params: {
        symbol: string;
        address: string;
        decimals: number;
    };
}

const initialState: State = {
    spaces: {},
};

export const setSpace = (space: {
    ens: string;
    name: string;
    about: string;
    network: string;
    avatar: string;
    strategies: Strategy[];
}): Action<{
    ens: string;
    name: string;
    about: string;
    network: string;
    avatar: string;
    strategies: Strategy[];
}> => ({
    type: ActionType.SET_SPACE,
    payload: space,
});

export const setAdmins = (ens: string, admins: string[]): Action<{ ens: string; admins: string[] }> => ({
    type: ActionType.SET_ADMINS,
    payload: {
        ens,
        admins,
    },
});

export const setMembers = (ens: string, members: string[]): Action<{ ens: string; members: string[] }> => ({
    type: ActionType.SET_MEMBERS,
    payload: {
        ens,
        members,
    },
});

export const useSpace = (ens: string): Space|null => {
    return useSelector((state: AppRootState) => {
        const space = state.snapshot.spaces[ens];
        return space || null;
    }, deepEqual);
};

export default function snapshot(state = initialState, action: Action<any>): State {
    switch (action.type) {
        case ActionType.SET_SPACE:
            return reduceSetSpace(state, action);
        case ActionType.SET_ADMINS:
            return reduceSetAdmins(state, action);
        case ActionType.SET_MEMBERS:
            return reduceSetMembers(state, action);
        default:
            return state;
    }
}

function reduceSetSpace(state: State, action: Action<Space>): State {
    return {
        ...state,
        spaces: {
            [action.payload.ens]: {
                ens: action.payload.ens,
                name: action.payload.name,
                avatar: action.payload.avatar,
                about: action.payload.about,
                network: action.payload.network,
                strategies: action.payload.strategies,
                admins: {},
                members: {},
            },
        },
    }
}

function reduceSetAdmins(state: State, action: Action<{ ens: string; admins: string[] }>): State {
    const space = state.spaces[action.payload.ens];
    return {
        ...state,
        spaces: {
            ...state.spaces,
            [action.payload.ens]: {
                ...space,
                admins: action.payload.admins.reduce((map: {[address: string]: string}, admin) => {
                    map[admin] = admin;
                    return map;
                }, {}),
            },
        },
    };
}

function reduceSetMembers(state: State, action: Action<{ ens: string; members: string[] }>): State {
    const space = state.spaces[action.payload.ens];
    return {
        ...state,
        spaces: {
            ...state.spaces,
            [action.payload.ens]: {
                ...space,
                members: action.payload.members.reduce((map: {[address: string]: string}, member) => {
                    map[member] = member;
                    return map;
                }, {}),
            },
        },
    };
}