import {
  MessageType,
  ModerationMessageSubType,
  parseMessageId,
  Post,
  PostMessageOption,
  PostMessageSubType,
} from '~/message';
import { fetchMessage } from '~/gun';
import { getUser } from './users';
import { ThunkDispatch } from 'redux-thunk';
import { AppRootState } from '../store/configureAppStore';
import { useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import config from '~/config';
import { Dispatch } from 'redux';
import { useHistory } from 'react-router';
import { useCallback } from 'react';

enum ActionTypes {
  SET_POSTS = 'posts/setPosts',
  SET_POST = 'posts/setPost',
  UNSET_POST = 'posts/unsetPost',
  SET_META = 'posts/setMeta',
  INCREMENT_REPLY = 'posts/incrementReply',
  INCREMENT_LIKE = 'posts/incrementLike',
  SET_LIKED = 'posts/setLiked',
  SET_BLOCKED = 'posts/setBlocked',
  SET_REPOSTED = 'posts/setReposted',
  DECREMENT_LIKE = 'posts/decrementLike',
  INCREMENT_REPOST = 'posts/incrementRepost',
  DECREMENT_REPOST = 'posts/decrementRepost',
  APPEND_POSTS = 'posts/appendPosts',
}

type Action = {
  type: ActionTypes;
  payload?: any;
  meta?: any;
  error?: boolean;
};

export type PostMeta = {
  replyCount: number;
  likeCount: number;
  repostCount: number;
  blocked: string | null;
  liked: string | null;
  reposted: string | null;
  interepProvider?: string;
  interepGroup?: string;
  moderation: ModerationMessageSubType | null;
  modBlockedPost?: string | null;
  modLikedPost?: string | null;
  modBlockedUser?: string | null;
  modFollowerUser?: string | null;
  modblockedctx?: string | null;
  modfollowedctx?: string | null;
  modmentionedctx?: string | null;
  rootId?: string | null;
};

type State = {
  map: { [messageId: string]: Post };
  meta: {
    [messageId: string]: PostMeta;
  };
};

const initialState: State = {
  map: {},
  meta: {},
};

export const fetchMeta =
  (messageId: string) =>
  async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const { hash } = parseMessageId(messageId);

    if (!hash) {
      return null;
    }

    const contextualName = getContextNameFromState(getState());

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
        messageId:
          post?.subtype === PostMessageSubType.Repost ? post?.payload.reference : post?.messageId,
        meta: post?.meta,
      },
    });
  };

export const fetchPost =
  (messageId: string) =>
  async (dispatch: ThunkDispatch<any, any, any>): Promise<PostMessageOption | null> => {
    const { creator, hash } = parseMessageId(messageId);
    const user: any = await dispatch(getUser(creator));

    let message;

    if (!creator) {
      message = await fetchMessage(`message/${messageId}`);
    } else if (creator && hash) {
      message = await fetchMessage(`~${user.pubkey}/message/${messageId}`);
    }

    if (!message) return null;

    dispatch(
      setPost(
        new Post({
          ...message,
          creator: creator,
        })
      )
    );

    return {
      ...message,
      creator: creator,
    };
  };

export const setPost = (post: Post) => ({
  type: ActionTypes.SET_POST,
  payload: post,
});

export const unsetPost = (messageId: string) => ({
  type: ActionTypes.UNSET_POST,
  payload: messageId,
});

export const incrementReply = (parentId: string) => ({
  type: ActionTypes.INCREMENT_REPLY,
  payload: parentId,
});

export const incrementLike = (parentId: string) => ({
  type: ActionTypes.INCREMENT_LIKE,
  payload: parentId,
});

export const setLiked = (parentId: string, messageId: string | null) => ({
  type: ActionTypes.SET_LIKED,
  payload: { parentId, messageId },
});

export const setReposted = (parentId: string, messageId: string | null) => ({
  type: ActionTypes.SET_REPOSTED,
  payload: { parentId, messageId },
});

export const setBlockedPost = (parentId: string, messageId: string | null) => ({
  type: ActionTypes.SET_BLOCKED,
  payload: { parentId, messageId },
});

export const decrementLike = (parentId: string) => ({
  type: ActionTypes.DECREMENT_LIKE,
  payload: parentId,
});

export const incrementRepost = (parentId: string) => ({
  type: ActionTypes.INCREMENT_REPOST,
  payload: parentId,
});

export const decrementRepost = (parentId: string) => ({
  type: ActionTypes.DECREMENT_REPOST,
  payload: parentId,
});

export const fetchPosts =
  (creator?: string, limit = 10, offset = 0) =>
  async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const creatorQuery = creator ? `&creator=${encodeURIComponent(creator)}` : '';
    const contextualName = getContextNameFromState(getState());
    const resp = await fetch(
      `${config.indexerAPI}/v1/posts?limit=${limit}&offset=${offset}${creatorQuery}`,
      {
        method: 'GET',
        // @ts-ignore
        headers: {
          'x-contextual-name': contextualName,
        },
      }
    );
    const json = await resp.json();
    dispatch(processPosts(json.payload));

    return json.payload.map((post: any) => post.messageId);
  };

export const fetchLikedBy =
  (creator?: string, limit = 10, offset = 0) =>
  async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const contextualName = getContextNameFromState(getState());
    const resp = await fetch(
      `${config.indexerAPI}/v1/${creator}/likes?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        // @ts-ignore
        headers: {
          'x-contextual-name': contextualName,
        },
      }
    );
    const json = await resp.json();
    dispatch(processPosts(json.payload));

    return json.payload.map((post: any) => post.messageId);
  };

export const fetchLikersByPost = async (
  messageId: string,
  limit = 10,
  offset = 0
): Promise<string[] | null> => {
  const { creator, hash } = parseMessageId(messageId);

  const resp = await fetch(
    `${config.indexerAPI}/v1/post/${creator}%2F${hash}/likes?limit=${limit}&offset=${offset}`,
    { method: 'GET' }
  );

  const { payload: likers } = await resp.json();
  return !likers.length ? null : likers;
};

export const fetchUserFollowers = async (
  user: string,
  limit = 10,
  offset = 0
): Promise<string[] | null> => {
  const resp = await fetch(
    `${config.indexerAPI}/v1/${user}/followers?limit=${limit}&offset=${offset}`,
    { method: 'GET' }
  );

  const { payload: users } = await resp.json();
  return !users.length ? null : users;
};

export const fetchUserFollowings = async (
  user: string,
  limit = 10,
  offset = 0
): Promise<string[] | null> => {
  const resp = await fetch(
    `${config.indexerAPI}/v1/${user}/followings?limit=${limit}&offset=${offset}`,
    { method: 'GET' }
  );

  const { payload: followings } = await resp.json();
  return !followings.length ? null : followings;
};

export const fetchRetweetsByPost = async (
  messageId: string,
  limit = 10,
  offset = 0
): Promise<string[] | null> => {
  const { creator, hash } = parseMessageId(messageId);

  const resp = await fetch(
    `${config.indexerAPI}/v1/post/${creator}%2F${hash}/retweets?limit=${limit}&offset=${offset}`,
    { method: 'GET' }
  );

  const { payload: retweets } = await resp.json();
  return !retweets.length ? null : retweets;
};

export const fetchRepliedBy =
  (creator: string, limit = 10, offset = 0) =>
  async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const contextualName = getContextNameFromState(getState());
    const resp = await fetch(
      `${config.indexerAPI}/v1/${creator}/replies?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        // @ts-ignore
        headers: {
          'x-contextual-name': contextualName,
        },
      }
    );
    const json = await resp.json();
    dispatch(processPosts(json.payload));

    return json.payload.map((post: any) => post.messageId);
  };

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

    const { creator } = parseMessageId(post.messageId);

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
};

export const fetchHomeFeed =
  (limit = 10, offset = 0) =>
  async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const contextualName = getContextNameFromState(getState());
    const resp = await fetch(`${config.indexerAPI}/v1/homefeed?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      // @ts-ignore
      headers: {
        'x-contextual-name': contextualName,
      },
    });
    const json = await resp.json();

    for (const post of json.payload) {
      dispatch({
        type: ActionTypes.SET_META,
        payload: {
          messageId:
            post?.subtype === PostMessageSubType.Repost ? post.payload.reference : post.messageId,
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
  };

export const fetchTagFeed =
  (tagName: string, limit = 10, offset = 0) =>
  async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const contextualName = getContextNameFromState(getState());
    const resp = await fetch(
      `${config.indexerAPI}/v1/tags/${encodeURIComponent(tagName)}?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        // @ts-ignore
        headers: {
          'x-contextual-name': contextualName,
        },
      }
    );
    const json = await resp.json();

    for (const post of json.payload) {
      dispatch({
        type: ActionTypes.SET_META,
        payload: {
          messageId:
            post.subtype === PostMessageSubType.Repost ? post.payload.reference : post.messageId,
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
  };

export const fetchReplies =
  (reference: string, limit = 10, offset = 0) =>
  async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    const state = getState();
    const contextualName = getContextNameFromState(state);
    const {
      mods: { posts },
      posts: { meta: metas },
    } = state;
    const meta = metas[reference];
    // @ts-ignore
    const mod = posts[meta?.rootId];

    const unmoderated = mod?.unmoderated;

    const resp = await fetch(
      `${config.indexerAPI}/v1/replies?limit=${limit}&offset=${offset}&parent=${encodeURIComponent(
        reference
      )}`,
      {
        method: 'GET',
        // @ts-ignore
        headers: {
          'x-contextual-name': contextualName,
          'x-unmoderated': !!unmoderated ? 'true' : '',
        },
      }
    );
    const json = await resp.json();

    for (const post of json.payload) {
      const [creator] = post.messageId.split('/');
      const p = new Post({
        ...post,
        createdAt: new Date(Number(post.createdAt)),
      });

      if (post.type === '@TWEET@') {
        // @ts-ignore
        p.type = '@TWEET@';
        p.creator = creator;
      }

      dispatch({
        type: ActionTypes.SET_META,
        payload: {
          messageId:
            post.subtype === PostMessageSubType.Repost ? post.payload.reference : post.messageId,
          meta: post.meta,
        },
      });

      dispatch({
        type: ActionTypes.SET_POST,
        payload: p,
      });
    }

    setTimeout(() => {
      json.payload.forEach((post: any) => dispatch(fetchPost(post.messageId)));
    }, 0);

    return json.payload.map((post: any) => post.messageId);
  };

export const usePosts = (): State => {
  return useSelector((state: AppRootState) => {
    return state.posts;
  }, deepEqual);
};

export const usePost = (messageId?: string): Post | null => {
  return useSelector((state: AppRootState) => {
    return state.posts.map[messageId || ''] || null;
  }, deepEqual);
};

export const useMeta = (messageId = '') => {
  return useSelector((state: AppRootState): PostMeta => {
    return (
      state.posts.meta[messageId] || {
        replyCount: 0,
        repostCount: 0,
        likeCount: 0,
        reposted: 0,
      }
    );
  }, deepEqual);
};

export const useZKGroupFromPost = (messageId?: string) => {
  return useSelector((state: AppRootState): string | undefined => {
    if (!messageId) return;
    const post = state.posts.meta[messageId];
    if (!post) return undefined;

    return post.interepProvider === 'taz'
      ? 'semaphore_taz_members'
      : `interrep_${post.interepProvider}_${post.interepGroup}`;
  }, deepEqual);
};

export const useCommentDisabled = (messageId?: string | null) => {
  return useSelector((state: AppRootState) => {
    const {
      posts: { meta },
      worker: { selected },
    } = state;

    if (!messageId) return false;

    const postMeta = meta[messageId];
    const rootMeta = meta[postMeta?.rootId || ''];

    if (postMeta?.rootId && selected?.type === 'gun') {
      const { creator } = parseMessageId(postMeta?.rootId);
      if (creator === selected?.address) return false;
    }

    switch (postMeta?.moderation) {
      case ModerationMessageSubType.ThreadBlock:
        return !!rootMeta?.modblockedctx;
      case ModerationMessageSubType.ThreadFollow:
        return !rootMeta?.modfollowedctx;
      case ModerationMessageSubType.ThreadMention:
        return !rootMeta?.modmentionedctx;
      default:
        return false;
    }
  }, deepEqual);
};

export const useGoToPost = () => {
  const history = useHistory();
  const posts = usePosts();
  return useCallback((messageId: string) => {
    const { creator, hash } = parseMessageId(messageId);
    const post = posts.map[messageId];

    if (post?.type === MessageType._TWEET) {
      return;
    }

    if (!creator) {
      history.push(`/post/${hash}`);
    }

    if (creator && hash) {
      history.push(`/${creator}/status/${hash}`);
    }
  }, []);
};

export default function posts(state = initialState, action: Action): State {
  switch (action.type) {
    case ActionTypes.SET_POSTS:
      return reduceSetPosts(state, action);
    case ActionTypes.SET_POST:
      return reduceSetPost(state, action);
    case ActionTypes.UNSET_POST:
      return reduceUnsetPost(state, action);
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
    case ActionTypes.SET_LIKED:
      return reduceSetLiked(state, action);
    case ActionTypes.SET_BLOCKED:
      return reduceSetBlocked(state, action);
    case ActionTypes.SET_REPOSTED:
      return reduceSetReposted(state, action);
    case ActionTypes.DECREMENT_LIKE:
      return reduceDecrementLike(state, action);
    case ActionTypes.DECREMENT_REPOST:
      return reduceDecrementRepost(state, action);
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
      [messageId]: post,
    },
  };
}

function reduceUnsetPost(state: State, action: Action): State {
  const messageId = action.payload as string;

  const newMap = {
    ...state.map,
  };

  if (newMap[messageId]) {
    delete newMap[messageId];
  }

  return {
    ...state,
    map: newMap,
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
  const { meta } = post;

  const messageId =
    post.subtype === PostMessageSubType.Repost ? post.payload.reference : post.messageId;

  return {
    ...state,
    meta: {
      ...state.meta,
      [messageId]: meta,
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
      },
    },
  };
}

function reduceSetLiked(state: State, action: Action): State {
  const { parentId, messageId } = action.payload;
  const meta = state.meta[parentId] || {};

  return {
    ...state,
    meta: {
      ...state.meta,
      [parentId]: {
        ...meta,
        liked: messageId,
      },
    },
  };
}

function reduceSetBlocked(state: State, action: Action): State {
  const { parentId, messageId } = action.payload;
  const meta = state.meta[parentId] || {};

  return {
    ...state,
    meta: {
      ...state.meta,
      [parentId]: {
        ...meta,
        blocked: messageId,
      },
    },
  };
}

function reduceSetReposted(state: State, action: Action): State {
  const { parentId, messageId } = action.payload;
  const meta = state.meta[parentId] || {};

  return {
    ...state,
    meta: {
      ...state.meta,
      [parentId]: {
        ...meta,
        reposted: messageId,
      },
    },
  };
}

function reduceDecrementLike(state: State, action: Action): State {
  const parentId = action.payload;
  const meta = state.meta[parentId] || {};
  const likeCount = meta.likeCount || 0;

  return {
    ...state,
    meta: {
      ...state.meta,
      [parentId]: {
        ...meta,
        likeCount: Math.max(0, Number(likeCount) - 1),
      },
    },
  };
}

function reduceDecrementRepost(state: State, action: Action): State {
  const parentId = action.payload;
  const meta = state.meta[parentId] || {};
  const repostCount = meta.repostCount || 0;

  return {
    ...state,
    meta: {
      ...state.meta,
      [parentId]: {
        ...meta,
        repostCount: Math.max(0, Number(repostCount) - 1),
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

export function getContextNameFromState(state: AppRootState): string | undefined {
  const {
    worker: { selected },
  } = state;

  let contextualName = undefined;

  if (selected) {
    contextualName = selected.address;
  }

  return contextualName;
}
