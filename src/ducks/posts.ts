import {parseMessageId, Post, PostMessageOption, PostMessageSubType} from "../util/message";
import {fetchMessage} from "../util/gun";
import {getUser, User} from "./users";
import {ThunkDispatch} from "redux-thunk";
import {AppRootState} from "../store/configureAppStore";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
import config from "../util/config";
import {Dispatch} from "redux";
import {useHistory} from "react-router";
import {useCallback} from "react";
import {fetchProposal} from "./snapshot";
import {parse} from "gun/examples/react-native/src/webview-crypto/serializeBinary";

enum ActionTypes {
    SET_POSTS = 'posts/setPosts',
    SET_POST = 'posts/setPost',
    SET_META = 'posts/setMeta',
    INCREMENT_REPLY = 'posts/incrementReply',
    INCREMENT_LIKE = 'posts/incrementLike',
    INCREMENT_REPOST = 'posts/incrementRepost',
    APPEND_POSTS = 'posts/appendPosts',
}

type Action = {
    type: ActionTypes;
    payload?: any;
    meta?: any;
    error?: boolean;
}

type PostMeta = {
    replyCount: number;
    likeCount: number;
    repostCount: number;
    liked: boolean;
    reposted: boolean;
}

type State = {
    map: { [messageId: string]: Post };
    meta: {
        [messageId: string]: PostMeta;
    };
}

const initialState: State = {
    map: {},
    meta: {},
};


export const fetchMeta = (messageId: string) => async (
    dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState
) => {
    const {
        web3: {
            account,
            gun: { pub, priv },
        },
    } = getState();
    const {hash} = parseMessageId(messageId);

    if (!hash) {
        return null;
    }

    const contextualName = (account && pub && priv) ? account : undefined;
    const resp = await fetch(`${config.indexerAPI}/v1/post/${hash}`, {
        method: 'GET',
        // @ts-ignore
        headers: {
            'x-contextual-name': contextualName,
        },
    });
    const json = await resp.json();
    const post = json.payload;

    dispatch({
        type: ActionTypes.SET_META,
        payload: {
            messageId: post.subtype === PostMessageSubType.Repost
                ? post.payload.reference
                : post.messageId,
            meta: post.meta,
        },
    });
}

export const fetchPost = (messageId: string) =>
    async (
        dispatch: ThunkDispatch<any, any, any>,
        getState: () => AppRootState,
    ): Promise<PostMessageOption | null> =>
{
    const {creator, hash} = parseMessageId(messageId);
    const user: any = await dispatch(getUser(creator));

    let message;

    if (!creator) {
        message = await fetchMessage(`message/${messageId}`);
    } else if (creator && hash) {
        message = await fetchMessage(`~${user.pubkey}/message/${messageId}`);
    }

    if (!message) return null;

    dispatch(setPost(new Post({
        ...message,
        creator: creator,
    })));

    return {
        ...message,
        creator: creator,
    };
}

export const setPost = (post: Post) => ({
    type: ActionTypes.SET_POST,
    payload: post,
});

export const incrementReply = (parentId: string) => ({
    type: ActionTypes.INCREMENT_REPLY,
    payload: parentId,
});

export const incrementLike = (parentId: string) => ({
    type: ActionTypes.INCREMENT_LIKE,
    payload: parentId,
});

export const incrementRepost = (parentId: string) => ({
    type: ActionTypes.INCREMENT_REPOST,
    payload: parentId,
});

export const fetchPosts = (creator?: string, limit = 10, offset = 0) =>
    async (
        dispatch: ThunkDispatch<any, any, any>,
        getState: () => AppRootState,
    ) =>
{
    const {
        web3: {
            account,
            gun: { pub, priv },
        },
    } = getState();
    const creatorQuery = creator ? `&creator=${encodeURIComponent(creator)}` : '';
    const contextualName = (account && pub && priv) ? account : undefined;
    const resp = await fetch(`${config.indexerAPI}/v1/posts?limit=${limit}&offset=${offset}${creatorQuery}`, {
        method: 'GET',
        // @ts-ignore
        headers: {
            'x-contextual-name': contextualName,
        },
    });
    const json = await resp.json();
    dispatch(processPosts(json.payload));

    return json.payload.map((post: any) => post.messageId);
}

export const fetchLikedBy = (creator?: string, limit = 10, offset = 0) =>
    async (
        dispatch: ThunkDispatch<any, any, any>,
        getState: () => AppRootState,
    ) =>
{
    const {
        web3: {
            account,
            gun: { pub, priv },
        },
    } = getState();
    const contextualName = (account && pub && priv) ? account : undefined;
    const resp = await fetch(`${config.indexerAPI}/v1/${creator}/likes?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        // @ts-ignore
        headers: {
            'x-contextual-name': contextualName,
        },
    });
    const json = await resp.json();
    dispatch(processPosts(json.payload));

    return json.payload.map((post: any) => post.messageId);
}


export const fetchRepliedBy = (creator: string, limit = 10, offset = 0) =>
    async (
        dispatch: ThunkDispatch<any, any, any>,
        getState: () => AppRootState,
    ) =>
{
    const {
        web3: {
            account,
            gun: { pub, priv },
        },
    } = getState();
    const contextualName = (account && pub && priv) ? account : undefined;
    const resp = await fetch(`${config.indexerAPI}/v1/${creator}/replies?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        // @ts-ignore
        headers: {
            'x-contextual-name': contextualName,
        },
    });
    const json = await resp.json();
    dispatch(processPosts(json.payload));

    return json.payload.map((post: any) => post.messageId);
}

const processPosts = (posts: any[]) => async (dispatch: Dispatch) => {
    for (const post of posts) {
        if (post.subtype === PostMessageSubType.Repost) {
            dispatch({
                type: ActionTypes.SET_META,
                payload: {
                    messageId: post.payload.reference,
                    meta: post.meta,
                },
            });
        } else {
            dispatch({
                type: ActionTypes.SET_META,
                payload: {
                    messageId: post.messageId,
                    meta: post.meta,
                },
            });
        }

        const {creator} = parseMessageId(post.messageId);

        dispatch({
            type: ActionTypes.SET_POST,
            payload: new Post({
                ...post,
                createdAt: new Date(Number(post.createdAt)),
                creator: creator || '',
            }),
        });

    }

    setTimeout(() => {
        // @ts-ignore
        posts.forEach((post: any) => dispatch(fetchPost(post.messageId)));
    }, 0);
}

export const fetchHomeFeed = (limit = 10, offset = 0) =>
    async (
        dispatch: ThunkDispatch<any, any, any>,
        getState: () => AppRootState,
    ) =>
{
    const {
        web3: {
            account,
            gun: { pub, priv },
        },
    } = getState();
    const contextualName = (account && pub && priv) ? account : undefined;
    const resp = await fetch(`${config.indexerAPI}/v1/homefeed?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        // @ts-ignore
        headers: {
            'x-contextual-name': contextualName,
        },
    });
    const json = await resp.json();

    for (const post of json.payload) {
        const [creator, hash] = post.messageId.split('/');

        dispatch({
            type: ActionTypes.SET_META,
            payload: {
                messageId: post.subtype === PostMessageSubType.Repost
                    ? post.payload.reference
                    : post.messageId,
                meta: post.meta,
            },
        });

        dispatch({
            type: ActionTypes.SET_POST,
            payload: new Post({
                ...post,
                createdAt: new Date(Number(post.createdAt)),
            }),
        });
    }

    setTimeout(() => {
        json.payload.forEach((post: any) => dispatch(fetchPost(post.messageId)));
    }, 0);

    return json.payload.map((post: any) => post.messageId);
}

export const fetchTagFeed = (tagName: string, limit = 10, offset = 0) =>
    async (
        dispatch: ThunkDispatch<any, any, any>,
        getState: () => AppRootState,
    ) =>
    {
        const {
            web3: {
                account,
                gun: { pub, priv },
            },
        } = getState();
        const contextualName = (account && pub && priv) ? account : undefined;
        const resp = await fetch(`${config.indexerAPI}/v1/tags/${encodeURIComponent(tagName)}?limit=${limit}&offset=${offset}`, {
            method: 'GET',
            // @ts-ignore
            headers: {
                'x-contextual-name': contextualName,
            },
        });
        const json = await resp.json();

        for (const post of json.payload) {
            const [creator, hash] = post.messageId.split('/');

            dispatch({
                type: ActionTypes.SET_META,
                payload: {
                    messageId: post.subtype === PostMessageSubType.Repost
                        ? post.payload.reference
                        : post.messageId,
                    meta: post.meta,
                },
            });

            dispatch({
                type: ActionTypes.SET_POST,
                payload: new Post({
                    ...post,
                    createdAt: new Date(Number(post.createdAt)),
                }),
            });
        }

        setTimeout(() => {
            json.payload.forEach((post: any) => dispatch(fetchPost(post.messageId)));
        }, 0);

        return json.payload.map((post: any) => post.messageId);
    }

export const fetchReplies = (reference: string, limit = 10, offset = 0) =>
    async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) =>
{
    const {
        web3: {
            account,
            gun: { pub, priv },
        },
    } = getState();
    const contextualName = (account && pub && priv) ? account : undefined;
    const resp = await fetch(`${config.indexerAPI}/v1/replies?limit=${limit}&offset=${offset}&parent=${encodeURIComponent(reference)}`, {
        method: 'GET',
        // @ts-ignore
        headers: {
            'x-contextual-name': contextualName,
        },
    });
    const json = await resp.json();

    for (const post of json.payload) {
        const [creator, hash] = post.messageId.split('/');

        dispatch({
            type: ActionTypes.SET_META,
            payload: {
                messageId: post.subtype === PostMessageSubType.Repost
                    ? post.payload.reference
                    : post.messageId,
                meta: post.meta,
            },
        });

        dispatch({
            type: ActionTypes.SET_POST,
            payload: new Post({
                ...post,
                createdAt: new Date(Number(post.createdAt)),
            }),
        });
    }

    setTimeout(() => {
        json.payload.forEach((post: any) => dispatch(fetchPost(post.messageId)));
    }, 0);

    return json.payload.map((post: any) => post.messageId);
}

export const usePosts = (): State => {
    return useSelector((state: AppRootState) => {
        return state.posts;
    }, deepEqual);
}

export const usePost = (messageId?: string): Post | null => {
    return useSelector((state: AppRootState) => {
        return state.posts.map[messageId || ''] || null;
    }, deepEqual);
}

export const useMeta = (messageId: string)  => {
    return useSelector((state: AppRootState): PostMeta => {
        return state.posts.meta[messageId] || {
            replyCount: 0,
            repostCount: 0,
            likeCount: 0,
            liked: 0,
            reposted: 0,
        };
    }, deepEqual);
}

export const useGoToPost = () => {
    const history = useHistory();
    return useCallback((messageId: string) => {
        const { creator, hash } = parseMessageId(messageId);

        if (!creator) {
            history.push(`/post/${hash}`);
        }

        if (creator && hash) {
            history.push(`/${creator}/status/${hash}`);
        }
    }, []);
}

export default function posts(state = initialState, action: Action): State {
    switch (action.type) {
        case ActionTypes.SET_POSTS:
            return reduceSetPosts(state, action);
        case ActionTypes.SET_POST:
            return reduceSetPost(state, action);
        case ActionTypes.SET_META:
            return reduceSetMeta(state, action);
        case ActionTypes.APPEND_POSTS:
            return reduceAppendPosts(state, action);
        case ActionTypes.INCREMENT_REPLY:
            return reduceIncrementReply(state, action);
        case ActionTypes.INCREMENT_REPOST:
            return reduceIncrementRepost(state, action);
        case ActionTypes.INCREMENT_LIKE:
            return reduceIncrementLike(state, action);
        default:
            return state;
    }
}

function reduceSetPost(state: State, action: Action): State {
    const post = action.payload as Post;
    const hash = post.hash();
    const messageId = post.creator ? post.creator + '/' + hash : hash;

    return {
        ...state,
        map: {
            ...state.map,
            [messageId]: post
        },
    };
}

function reduceSetPosts(state: State, action: Action): State {
    const payload = action.payload as Post[];
    const posts: { [h: string]: Post } = {};

    for (const post of payload) {
        const hash = post.hash();
        const messageId = post.creator ? post.creator + '/' + hash : hash;
        posts[messageId] = post;
    }

    return {
        ...state,
        map: posts,
    };
}

function reduceSetMeta(state: State, action: Action): State {
    const post = action.payload;
    const {meta} = post;

    const messageId = post.subtype === PostMessageSubType.Repost
        ? post.payload.reference
        : post.messageId;

    return {
        ...state,
        meta: {
            ...state.meta,
            [messageId]: meta
        },
    };
}

function reduceIncrementReply(state: State, action: Action): State {
    const parentId = action.payload;
    const meta = state.meta[parentId] || {};
    const replyCount = meta.replyCount || 0;

    return {
        ...state,
        meta: {
            ...state.meta,
            [parentId]: {
                ...meta,
                replyCount: Number(replyCount) + 1,
            },
        },
    };
}

function reduceIncrementRepost(state: State, action: Action): State {
    const parentId = action.payload;
    const meta = state.meta[parentId] || {};
    const repostCount = meta.repostCount || 0;

    return {
        ...state,
        meta: {
            ...state.meta,
            [parentId]: {
                ...meta,
                repostCount: Number(repostCount) + 1,
                reposted: true,
            },
        },
    };
}

function reduceIncrementLike(state: State, action: Action): State {
    const parentId = action.payload;
    const meta = state.meta[parentId] || {};
    const likeCount = meta.likeCount || 0;

    return {
        ...state,
        meta: {
            ...state.meta,
            [parentId]: {
                ...meta,
                likeCount: Number(likeCount) + 1,
                liked: true,
            },
        },
    };
}

function reduceAppendPosts(state: State, action: Action): State {
    const payload = action.payload as Post[];
    const posts: { [h: string]: Post } = {};

    for (const post of payload) {
        const messageId = post.creator + '/' + post.hash();
        posts[messageId] = post;
    }

    return {
        ...state,
        ...posts,
    };
}