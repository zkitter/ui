import deepEqual from 'fast-deep-equal';
import { useSelector } from 'react-redux';

import { AppRootState } from '../store/configureAppStore';

const THEME_LS_KEY = 'theme';

enum ActionTypes {
  SET_THEME = 'app/setTheme',
}

type Action<payload> = {
  type: ActionTypes;
  payload: payload;
  meta?: any;
  error?: boolean;
};

type State = {
  theme: string;
};

const getTheme = () => {
  const theme = localStorage.getItem(THEME_LS_KEY);
  if (theme === 'dark' || theme === 'light') return theme;
  if (window.matchMedia('(prefers-color-scheme: dark)')) return 'dark';
  return 'light';
};

const initialState = {
  theme: getTheme(),
};

export const setTheme = (theme: 'dark' | 'light') => {
  localStorage.setItem(THEME_LS_KEY, theme);
  return {
    type: ActionTypes.SET_THEME,
    payload: theme,
  };
};

export const useSetting = () => {
  return useSelector((state: AppRootState) => {
    return {
      theme: state.app.theme,
    };
  }, deepEqual);
};

export default function app(state = initialState, action: Action<any>): State {
  switch (action.type) {
    case ActionTypes.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      };
    default:
      return state;
  }
}
