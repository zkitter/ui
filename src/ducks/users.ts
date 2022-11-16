import { Dispatch } from 'redux';
import { AppRootState } from '../store/configureAppStore';
import { useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import config from '~/config';
import { fetchAddressByName as _fetchAddressByName } from '~/web3';
import { ThunkDispatch } from 'redux-thunk';
import { getContextNameFromState } from './posts';

enum ActionTypes {
  SET_USER = 'users/setUser',
  RESET_USERS = 'users/resetUsers',
  SET_FOLLOWED = 'users/setFollowed',
  SET_BLOCKED = 'users/setBlocked',
  SET_USER_ADDRESS = 'users/setUserAddress',
  SET_ECDH = 'users/setECDH',
  SET_ID_COMMITMENT = 'users/setIdCommitment',
  SET_ACCEPTANCE_SENT = 'users/setAcceptanceSent',
}

type Action<payload> = {
  type: ActionTypes;
  payload?: payload;
  meta?: any;
  error?: boolean;
};

export type User = {
  username: string;
  ens?: string;
  name: string;
  pubkey: string;
  address: string;
  coverImage: string;
  profileImage: string;
  twitterVerification: string;
  bio: string;
  website: string;
  group: boolean;
  ecdh: string;
  idcommitment: string;
  joinedAt: number;
  joinedTx: string;
  type: 'ens' | 'arbitrum' | '';
  meta: {
    blockedCount: number;
    blockingCount: number;
    followerCount: number;
    followingCount: number;
    postingCount: number;
    followed: string | null;
    blocked: string | null;
    inviteSent: string | null;
    acceptanceReceived: string | null;
    inviteReceived: string | null;
    acceptanceSent: string | null;
  };
};

type State = {
  map: {
    [name: string]: User;
  };
};

const initialState: State = {
  map: {},
};

let fetchPromises: any = {};
let cachedUser: any = {};

export const fetchAddressByName = (ens: string) => async (dispatch: Dispatch) => {
  const address = await _fetchAddressByName(ens);
  dispatch({
    type: ActionTypes.SET_USER_ADDRESS,
    payload: {
      ens: ens,
      address: address === '0x0000000000000000000000000000000000000000' ? '' : address,
    },
  });
  return address;
};

export const watchUser = (username: string) => async (dispatch: ThunkDispatch<any, any, any>) => {
  return new Promise(async (resolve, reject) => {
    _getUser();

    async function _getUser() {
      const user: any = await dispatch(getUser(username));

      if (!user?.joinedTx) {
        setTimeout(_getUser, 5000);
        return;
      }

      resolve(user);
    }
  });
};

export const getUser =
  (address: string) =>
  async (dispatch: Dispatch, getState: () => AppRootState): Promise<User> => {
    const contextualName = getContextNameFromState(getState());
    const key = contextualName + address;

    if (fetchPromises[key]) {
      return fetchPromises[key];
    }

    const fetchPromise = new Promise<User>(async (resolve, reject) => {
      let payload;

      if (cachedUser[key]) {
        payload = cachedUser[key];
      } else {
        const resp = await fetch(`${config.indexerAPI}/v1/users/${address}`, {
          method: 'GET',
          // @ts-ignore
          headers: {
            'x-contextual-name': contextualName,
          },
        });
        const json = await resp.json();
        // @ts-ignore
        payload = dispatch(processUserPayload({ ...json.payload }));
        if (payload?.joinedTx) {
          cachedUser[key] = payload;
        }

        delete fetchPromises[key];
      }

      dispatch({
        type: ActionTypes.SET_USER,
        payload: payload,
      });

      resolve(payload);
    });

    fetchPromises[key] = fetchPromise;

    return fetchPromise;
  };

export const fetchUsers =
  () =>
  async (dispatch: Dispatch, getState: () => AppRootState): Promise<string[]> => {
    const contextualName = getContextNameFromState(getState());
    const resp = await fetch(`${config.indexerAPI}/v1/users?limit=5`, {
      method: 'GET',
      // @ts-ignore
      headers: {
        'x-contextual-name': contextualName,
      },
    });

    const json = await resp.json();
    const list: string[] = [];

    for (const user of json.payload) {
      // @ts-ignore
      const payload = dispatch(processUserPayload(user));
      const key = contextualName + user.address;
      if (payload?.joinedTx) {
        cachedUser[key] = payload;
      }
      list.push(user.address);
    }

    return list;
  };

export const searchUsers =
  (query: string) =>
  async (dispatch: Dispatch, getState: () => AppRootState): Promise<string[]> => {
    const contextualName = getContextNameFromState(getState());
    const resp = await fetch(
      `${config.indexerAPI}/v1/users/search/${encodeURIComponent(query)}?limit=5`,
      {
        method: 'GET',
        // @ts-ignore
        headers: {
          'x-contextual-name': contextualName,
        },
      }
    );

    const json = await resp.json();
    const list: string[] = [];

    for (const user of json.payload) {
      // @ts-ignore
      const payload = dispatch(processUserPayload({ ...user }));
      const key = contextualName + user.address;
      if (payload?.joinedTx) {
        cachedUser[key] = payload;
      }
      list.push(user.address);
    }

    return json.payload;
  };

export const setAcceptanceSent = (
  address: string,
  acceptanceSent: string | null
): Action<{ address: string; acceptanceSent: string | null }> => ({
  type: ActionTypes.SET_ACCEPTANCE_SENT,
  payload: { address, acceptanceSent },
});

export const setFollowed = (
  address: string,
  followed: string | null
): Action<{ address: string; followed: string | null }> => ({
  type: ActionTypes.SET_FOLLOWED,
  payload: { address, followed },
});

export const setBlocked = (
  address: string,
  blocked: string | null
): Action<{ address: string; blocked: string | null }> => ({
  type: ActionTypes.SET_BLOCKED,
  payload: { address, blocked },
});

export const setEcdh = (
  address: string,
  ecdh: string
): Action<{ address: string; ecdh: string }> => ({
  type: ActionTypes.SET_ECDH,
  payload: { address, ecdh },
});

export const setIdCommitment = (
  address: string,
  idcommitment: string
): Action<{ address: string; idcommitment: string }> => ({
  type: ActionTypes.SET_ID_COMMITMENT,
  payload: { address, idcommitment },
});

export const resetUser = () => {
  fetchPromises = {};
  cachedUser = {};
  return {
    type: ActionTypes.RESET_USERS,
  };
};

const processUserPayload = (user: any) => (dispatch: Dispatch) => {
  const payload: User = {
    address: user.username,
    ens: user.ens,
    username: user.username,
    name: user.name || '',
    pubkey: user.pubkey || '',
    bio: user.bio || '',
    profileImage: user.profileImage || '',
    coverImage: user.coverImage || '',
    group: !!user.group,
    twitterVerification: user.twitterVerification || '',
    website: user.website || '',
    ecdh: user.ecdh || '',
    idcommitment: user.idcommitment || '',
    joinedAt: user.joinedAt || '',
    joinedTx: user.joinedTx || '',
    type: user.type || '',
    meta: {
      followerCount: user.meta?.followerCount || 0,
      followingCount: user.meta?.followingCount || 0,
      blockedCount: user.meta?.blockedCount || 0,
      blockingCount: user.meta?.blockingCount || 0,
      postingCount: user.meta?.postingCount || 0,
      followed: user.meta?.followed || null,
      blocked: user.meta?.blocked || null,
      inviteSent: user.meta?.inviteSent || null,
      acceptanceReceived: user.meta?.acceptanceReceived || null,
      inviteReceived: user.meta?.inviteReceived || null,
      acceptanceSent: user.meta?.acceptanceSent || null,
    },
  };

  dispatch({
    type: ActionTypes.SET_USER,
    payload: payload,
  });

  return payload;
};

export const setUser = (user: User) => ({
  type: ActionTypes.SET_USER,
  payload: user,
});

export const useConnectedTwitter = (address = '') => {
  return useSelector((state: AppRootState) => {
    const user = state.users.map[address];

    if (!user?.twitterVerification) return null;

    const [twitterHandle] = user.twitterVerification.replace('https://twitter.com/', '').split('/');
    return twitterHandle;
  }, deepEqual);
};

export const useUser = (address = ''): User | null => {
  return useSelector((state: AppRootState) => {
    if (!address) return null;

    const user = state.users.map[address];

    if (!user) {
      return {
        username: address,
        name: '',
        pubkey: '',
        address: address,
        coverImage: '',
        profileImage: '',
        twitterVerification: '',
        bio: '',
        website: '',
        ecdh: '',
        idcommitment: '',
        joinedAt: 0,
        joinedTx: '',
        type: '',
        group: false,
        meta: {
          followerCount: 0,
          followingCount: 0,
          blockedCount: 0,
          blockingCount: 0,
          postingCount: 0,
          followed: null,
          blocked: null,
          inviteSent: null,
          acceptanceReceived: null,
          inviteReceived: null,
          acceptanceSent: null,
        },
      };
    }

    return user;
  }, deepEqual);
};

export default function users(state = initialState, action: Action<any>): State {
  switch (action.type) {
    case ActionTypes.SET_USER:
      return reduceSetUser(state, action);
    case ActionTypes.RESET_USERS:
      return {
        map: {},
      };
    case ActionTypes.SET_ACCEPTANCE_SENT:
      return {
        ...state,
        map: {
          ...state.map,
          [action.payload.address]: {
            ...state.map[action.payload.address],
            meta: {
              ...state.map[action.payload.address]?.meta,
              acceptanceSent: action.payload.acceptanceSent,
            },
          },
        },
      };
    case ActionTypes.SET_FOLLOWED:
      return {
        ...state,
        map: {
          ...state.map,
          [action.payload.address]: {
            ...state.map[action.payload.address],
            meta: {
              ...state.map[action.payload.address]?.meta,
              followed: action.payload.followed,
              followerCount:
                state.map[action.payload.address]?.meta.followerCount +
                (action.payload.followed ? 1 : -1),
            },
          },
        },
      };
    case ActionTypes.SET_BLOCKED:
      return {
        ...state,
        map: {
          ...state.map,
          [action.payload.address]: {
            ...state.map[action.payload.address],
            meta: {
              ...state.map[action.payload.address]?.meta,
              blocked: action.payload.blocked,
            },
          },
        },
      };
    case ActionTypes.SET_ECDH:
      return {
        ...state,
        map: {
          ...state.map,
          [action.payload.address]: {
            ...state.map[action.payload.address],
            ecdh: action.payload.ecdh,
          },
        },
      };
    case ActionTypes.SET_ID_COMMITMENT:
      return {
        ...state,
        map: {
          ...state.map,
          [action.payload.address]: {
            ...state.map[action.payload.address],
            idcommitment: action.payload.idcommitment,
          },
        },
      };
    case ActionTypes.SET_USER_ADDRESS:
      return reduceSetUserAddress(state, action);
    default:
      return state;
  }
}

function reduceSetUserAddress(
  state: State,
  action: Action<{ ens: string; address: string }>
): State {
  if (!action.payload) return state;

  const user = state.map[action.payload.address];

  return {
    ...state,
    map: {
      ...state.map,
      [action.payload.address]: {
        ...user,
        ens: action.payload.ens,
        username: action.payload.address,
        address: action.payload.address,
      },
    },
  };
}

function reduceSetUser(state: State, action: Action<User>): State {
  if (!action.payload) return state;

  const user = state.map[action.payload.username];

  return {
    ...state,
    map: {
      ...state.map,
      [action.payload.username]: {
        ...user,
        username: action.payload.username,
        address: action.payload.address,
        name: action.payload.name,
        ens: action.payload.ens,
        pubkey: action.payload.pubkey,
        bio: action.payload.bio,
        profileImage: action.payload.profileImage,
        twitterVerification: action.payload.twitterVerification,
        coverImage: action.payload.coverImage,
        website: action.payload.website,
        ecdh: action.payload.ecdh,
        idcommitment: action.payload.idcommitment,
        joinedAt: action.payload.joinedAt,
        joinedTx: action.payload.joinedTx,
        type: action.payload.type,
        group: action.payload.group,
        meta: {
          followerCount: action.payload.meta?.followerCount || 0,
          followingCount: action.payload.meta?.followingCount || 0,
          blockedCount: action.payload.meta?.blockedCount || 0,
          blockingCount: action.payload.meta?.blockingCount || 0,
          postingCount: action.payload.meta?.postingCount || 0,
          followed: action.payload.meta?.followed || null,
          blocked: action.payload.meta?.blocked || null,
          inviteSent: action.payload.meta?.inviteSent || null,
          acceptanceReceived: action.payload.meta?.acceptanceReceived || null,
          inviteReceived: action.payload.meta?.inviteReceived || null,
          acceptanceSent: action.payload.meta?.acceptanceSent || null,
        },
      },
    },
  };
}
