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
    APPEND_POSTS = 'posts/appendPosts',
}

type Action = {
    type: ActionTypes;
    payload?: any;
    meta?: any;
    error?: boolean;
}

type State = {
    [messageId: string]: Post;
}

const initialState: State = {};

export const fetchPost = (messageId: string) =>
    async (dispatch: ThunkDispatch<any, any, any>): Promise<PostMessageOption> =>
{
    const [username] = messageId.split('/');
    const user: any = await dispatch(getUser(username));
    const message = await fetchMessage(`~${user.pubkey}/message/${messageId}`);

    return {
        ...message,
        creator: username,
    };
}

export const fetchPosts = (limit = 10, offset = 0) => async (dispatch: ThunkDispatch<any, any, any>) => {
    const resp = await fetch(`${config.indexerAPI}/v1/posts?limit=${limit}&offset=${offset}`);
    const json = await resp.json();
    const posts: Post[] = [];

    for (const post of json.payload) {
        const messageId = post.messageId;
        const message: any = await dispatch(fetchPost(messageId));
        posts.push(new Post({
            ...message,
            meta: post.meta,
        }));
    }

    dispatch({
        type: ActionTypes.SET_POSTS,
        payload: posts,
    });

    return json.payload.map((post: any) => post.messageId);
}

export const usePosts = (): State => {
    return useSelector((state: AppRootState) => {
        return state.posts;
    }, deepEqual);
}

export const usePost = (messageId: string): Post | null => {
    return useSelector((state: AppRootState) => {
        return state.posts[messageId] || null;
    }, deepEqual);
}

export default function posts(state = initialState, action: Action): State {
    switch (action.type) {
        case ActionTypes.SET_POSTS:
            return reduceSetPosts(state, action);
        case ActionTypes.APPEND_POSTS:
            return reduceAppendPosts(state, action);
        default:
            return state;
    }
}

function reduceSetPosts(state: State, action: Action): State {
    const payload = action.payload as Post[];
    const posts: { [h: string]: Post } = {};

    for (const post of payload) {
        const messageId = post.creator + '/' + post.hash();
        posts[messageId] = post;
    }

    return posts;
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