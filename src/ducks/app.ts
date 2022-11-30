import { useSelector } from 'react-redux';
import { AppRootState } from '../store/configureAppStore';
import deepEqual from 'fast-deep-equal';
import config from '../util/config';

const THEME_LS_KEY = 'theme';
const LAST_READ_LS_KEY = 'zkitter/lastRead/';

enum ActionTypes {
  SET_THEME = 'app/setTheme',
  UPDATE_NOTIFICATIONS = 'app/updateNotifications',
  UPDATE_LAST_READ = 'app/updateLastRead',
}

type Action<payload> = {
  type: ActionTypes;
  payload: payload;
  meta?: any;
  error?: boolean;
};

type State = {
  theme: string;
  notifications: number;
  lastRead: Date;
};

const getTheme = () => {
  let theme = localStorage.getItem(THEME_LS_KEY);
  if (theme === 'dark' || theme === 'light') return theme;
  if (window.matchMedia('(prefers-color-scheme: dark)')) return 'dark';
  return 'light';
};

const initialState: State = {
  theme: getTheme(),
  notifications: 0,
  lastRead: new Date(0),
};

export const setTheme = (theme: 'dark' | 'light') => {
  localStorage.setItem(THEME_LS_KEY, theme);
  return {
    type: ActionTypes.SET_THEME,
    payload: theme,
  };
};

export const updateLastReadTimestamp = () => (dispatch: any, getState: () => AppRootState) => {
  const {
    worker: { selected },
  } = getState();
  if (selected?.type !== 'gun') return;
  const { address } = selected;
  const key = LAST_READ_LS_KEY + address;
  const date = new Date();
  localStorage.setItem(key, date.toString());
  dispatch({
    type: ActionTypes.UPDATE_LAST_READ,
    payload: date,
  });
  dispatch({
    type: ActionTypes.UPDATE_NOTIFICATIONS,
    payload: 0,
  });
};

export const refreshLastRead = () => (dispatch: any, getState: () => AppRootState) => {
  const {
    worker: { selected },
  } = getState();
  if (selected?.type !== 'gun') return;
  const { address } = selected;
  const key = LAST_READ_LS_KEY + address;
  const lastRead = localStorage.getItem(key);
  dispatch({
    type: ActionTypes.UPDATE_LAST_READ,
    payload: new Date(lastRead || 0),
  });
};

export const updateNotifications = () => async (dispatch: any, getState: () => AppRootState) => {
  const {
    worker: { selected },
    app: { lastRead },
  } = getState();
  if (selected?.type !== 'gun') return;
  const { address } = selected;
  const resp = await fetch(
    `${config.indexerAPI}/v1/${address}/notifications/unread?lastRead=${lastRead.getTime()}`
  );
  const json = await resp.json();

  if (json.error || !json.payload?.TOTAL) return 0;

  dispatch({
    type: ActionTypes.UPDATE_NOTIFICATIONS,
    payload: json.payload.TOTAL || 0,
  });
};

export default function app(state = initialState, action: Action<any>): State {
  switch (action.type) {
    case ActionTypes.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      };
    case ActionTypes.UPDATE_LAST_READ:
      return {
        ...state,
        lastRead: action.payload,
      };
    case ActionTypes.UPDATE_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload,
      };
    default:
      return state;
  }
}

export const useSetting = () => {
  return useSelector((state: AppRootState) => {
    return {
      theme: state.app.theme,
    };
  }, deepEqual);
};

export const useUnreadCounts = () => {
  return useSelector((state: AppRootState) => {
    return state.app.notifications;
  }, deepEqual);
};
