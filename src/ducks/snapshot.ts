import {useSelector} from "react-redux";
import {AppRootState} from "../store/configureAppStore";
import deepEqual from "fast-deep-equal";
import {ThunkDispatch} from "redux-thunk";
import config from "../util/config";
import snapshotjs from '@snapshot-labs/snapshot.js';
import {Dispatch} from "redux";
import {parseMessageId} from "../util/message";

export enum ActionType {
    SET_SPACE = 'SET_SPACE',
    SET_ADMINS = 'SET_ADMINS',
    SET_MEMBERS = 'SET_MEMBERS',
    SET_PROPOSAL = 'SET_PROPOSAL',
    SET_SCORES = 'SET_SCORES',
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
    proposals: {
        [proposalId: string]: Proposal;
    };
}

export type Proposal = {
    id: string;
    author: string;
    title: string;
    body: string;
    choices: string[];
    end: Date;
    snapshot: string;
    spaceId: string;
    start: Date;
    created: Date;
    state: string;
    scores: number[];
    meta: {
        replyCount: number;
        likeCount: number;
        repostCount: number;
        liked: boolean;
        reposted: boolean;
    };
};

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
    proposals: {},
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

export const setScores = (proposalId: string, scores: number[]): Action<{ proposalId: string; scores: number[] }> => ({
    type: ActionType.SET_SCORES,
    payload: {
        proposalId,
        scores,
    },
});

export const setProposal = (proposal: Proposal) => ({
    type: ActionType.SET_PROPOSAL,
    payload: proposal,
});

export const fetchScores = (proposalId: string, limit = 10, offset = 0) =>
    async (
        dispatch: ThunkDispatch<any, any, any>,
        getState: () => AppRootState,
    ) =>
{
    const resp = await fetch(`${config.indexerAPI}/v1/snapshot-votes/${proposalId}`, {
        method: 'GET',
    });
    const json = await resp.json();

    if (json.error) {
        throw new Error(json.payload);
    }

    dispatch(setScores(proposalId, json.payload));

    return json.payload;
}

export const fetchProposal = (proposalId: string) =>
    async (
        dispatch: ThunkDispatch<any, any, any>,
        getState: () => AppRootState,
    ) =>
{
    const {hash} = parseMessageId(proposalId);

    if (hash) return;

    const {
        web3: {
            ensName,
            gun: { pub, priv },
        },
    } = getState();
    const contextualName = (ensName && pub && priv) ? ensName : undefined;
    const resp = await fetch(`${config.indexerAPI}/v1/snapshot-proposal/${proposalId}`, {
        method: 'GET',
        // @ts-ignore
        headers: {
            'x-contextual-name': contextualName,
        },
    });
    const json = await resp.json();
    return dispatch(processProposal(json.payload));
}

export const fetchProposals = (creator?: string, limit = 10, offset = 0) =>
    async (
        dispatch: ThunkDispatch<any, any, any>,
        getState: () => AppRootState,
    ) =>
{
    const {
        web3: {
            ensName,
            gun: { pub, priv },
        },
    } = getState();
    const creatorQuery = creator ? `&creator=${encodeURIComponent(creator)}` : '';
    const contextualName = (ensName && pub && priv) ? ensName : undefined;
    const resp = await fetch(`${config.indexerAPI}/v1/snapshot-proposals?limit=${limit}&offset=${offset}${creatorQuery}`, {
        method: 'GET',
        // @ts-ignore
        headers: {
            'x-contextual-name': contextualName,
        },
    });
    const json = await resp.json();

    for (let proposal of json.payload) {
        dispatch(processProposal(proposal));
    }

    return json.payload.map((p: any) => p.id);
}

const processProposal = (payload: any) => (dispatch: Dispatch): Proposal => {
    const proposal: Proposal = {
        id: payload.id,
        author: payload.author,
        body: payload.body,
        choices: payload.choices,
        end: new Date(payload.end * 1000),
        snapshot: payload.snapshot,
        spaceId: payload.space?.id,
        start: new Date(payload.start * 1000),
        created: new Date(payload.created * 1000),
        state: payload.state,
        title: payload.title,
        scores: payload.meta?.scores || [],
        meta: {
            replyCount: payload.meta?.replyCount || 0,
            repostCount: payload.meta?.repostCount || 0,
            likeCount: payload.meta?.likeCount || 0,
            liked: payload.meta?.liked || 0,
            reposted: payload.meta?.reposted || 0,
        },
    };

    dispatch(setProposal(proposal));

    return proposal;
}

export const useSpace = (ens?: string): Space|null => {
    return useSelector((state: AppRootState) => {
        if (!ens) return null;

        const space = state.snapshot.spaces[ens];
        return space || null;
    }, deepEqual);
};

export const useProposal = (id: string): Proposal|null => {
    return useSelector((state: AppRootState) => {
        const proposal = state.snapshot.proposals[id];
        return proposal || null;
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
        case ActionType.SET_PROPOSAL:
            return reduceSetProposal(state, action);
        case ActionType.SET_SCORES:
            return {
                ...state,
                proposals: {
                    ...state.proposals,
                    [action.payload.proposalId]: {
                        ...state.proposals[action.payload.proposalId],
                        scores: action.payload.scores,
                    },
                },
            };
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

function reduceSetProposal(state: State, action: Action<Proposal>): State {
    return {
        ...state,
        proposals: {
            ...state.proposals,
            [action.payload.id]: action.payload,
        },
    };
}