import {Post, PostMessageOption} from "../util/message";
import {fetchMessage} from "../util/gun";
import {getUser} from "./users";
import {ThunkDispatch} from "redux-thunk";
import {AppRootState} from "../store/configureAppStore";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
import config from "../util/config";

enum ActionTypes {
    SET_POSTS = 'posts/setPosts',
    SET_POST = 'posts/setPost',
    SET_META = 'posts/setMeta',
    APPEND_POSTS = 'posts/appendPosts',
}

type Action = {
    type: ActionTypes;
    payload?: any;
    meta?: any;
    error?: boolean;
}

type State = {
    map: { [messageId: string]: Post };
    meta: {
        [messageId: string]: {
            replyCount: number;
            likeCount: number;
            repostCount: number;
        };
    };
}

const initialState: State = {
    map: {},
    meta: {},
};

export const fetchPost = (messageId: string) =>
    async (dispatch: ThunkDispatch<any, any, any>): Promise<PostMessageOption> =>
{
    const [username] = messageId.split('/');
    const user: any = await dispatch(getUser(username));
    const message = await fetchMessage(`~${user.pubkey}/message/${messageId}`);

    dispatch({
        type: ActionTypes.SET_POST,
        payload: new Post({
            ...message,
            creator: username,
        }),
    });

    return {
        ...message,
        creator: username,
    };
}

export const fetchPosts = (limit = 10, offset = 0) => async (dispatch: ThunkDispatch<any, any, any>) => {
    const resp = await fetch(`${config.indexerAPI}/v1/posts?limit=${limit}&offset=${offset}`);
    const json = await resp.json();

    for (const post of json.payload) {
        dispatch({
            type: ActionTypes.SET_META,
            payload: post,
        })
    }

    return json.payload.map((post: any) => post.messageId);
}

export const fetchReplies = (reference: string, limit = 10, offset = 0) => async (dispatch: ThunkDispatch<any, any, any>) => {
    const resp = await fetch(`${config.indexerAPI}/v1/replies?limit=${limit}&offset=${offset}&parent=${encodeURIComponent(reference)}`);
    const json = await resp.json();

    for (const post of json.payload) {
        dispatch({
            type: ActionTypes.SET_META,
            payload: post,
        })
    }

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
    return useSelector((state: AppRootState) => {
        return state.posts.meta[messageId] || {
            replyCount: 0,
            repostCount: 0,
            likeCount: 0,
        };
    }, deepEqual);
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
        default:
            return state;
    }
}

function reduceSetPost(state: State, action: Action): State {
    const post = action.payload as Post;
    const messageId = post.creator + '/' + post.hash();

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
        const messageId = post.creator + '/' + post.hash();
        posts[messageId] = post;
    }

    return {
        ...state,
        map: posts,
    };
}

function reduceSetMeta(state: State, action: Action): State {
    const {messageId, meta} = action.payload;

    return {
        ...state,
        meta: {
            ...state.meta,
            [messageId]: meta
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