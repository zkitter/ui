import deepEqual from 'fast-deep-equal';
import { useSelector } from 'react-redux';

import { AppRootState } from '../store/configureAppStore';

enum ActionTypes {
  UNMODERATE = 'mods/unmoderate',
}

type Action<payload> = {
  type: ActionTypes;
  payload?: payload;
  meta?: any;
  error?: boolean;
};

type ModSetting = {
  unmoderated: boolean;
};

type State = {
  posts: {
    [messageId: string]: ModSetting;
  };
};

const initialState: State = {
  posts: {},
};

export const unmoderate = (
  messageId: string,
  unmoderated: boolean
): Action<{
  messageId: string;
  unmoderated: boolean;
}> => ({
  type: ActionTypes.UNMODERATE,
  payload: {
    messageId,
    unmoderated,
  },
});

export const usePostModeration = (messageId?: string | null): ModSetting | null => {
  return useSelector((state: AppRootState) => {
    if (!messageId) return null;
    return state.mods.posts[messageId] || null;
  }, deepEqual);
};

export default function mods(state = initialState, action: Action<any>): State {
  switch (action.type) {
    case ActionTypes.UNMODERATE:
      return {
        ...state,
        posts: {
          ...state.posts,
          [action.payload.messageId]: {
            ...state.posts[action.payload.messageId],
            unmoderated: action.payload.unmoderated,
          },
        },
      };
    default:
      return state;
  }
}
