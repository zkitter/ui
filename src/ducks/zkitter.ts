import { Zkitter } from 'zkitter-js';
import { Dispatch } from 'redux';
import { useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { AppRootState } from '../store/configureAppStore';

export enum ActionType {
  SET_CLIENT = 'zkitter-js/SET_CLIENT',
  SET_LOADING = 'zkitter-js/SET_LOADING',
}

export type Action<payload> = {
  type: ActionType;
  payload?: payload;
  meta?: any;
  error?: boolean;
};

export type State = {
  client: Zkitter | null;
  loading: boolean;
};

const initialState: State = {
  client: null,
  loading: false,
};

export const initZkitter = () => async (dispatch: Dispatch) => {
  const opts: any = {};

  if (process.env.NODE_ENV !== 'production') opts.topicPrefix = 'zkitter-dev';

  dispatch({
    type: ActionType.SET_LOADING,
    payload: true,
  });

  const node = await Zkitter.initialize(opts);

  node.on('Users.ArbitrumSynced', console.log.bind(console));
  node.on('Group.GroupSynced', console.log.bind(console));
  node.on('Zkitter.NewMessageCreated', console.log.bind(console));

  await node.start();
  await node.subscribe();

  dispatch({
    type: ActionType.SET_LOADING,
    payload: false,
  });

  dispatch({
    type: ActionType.SET_CLIENT,
    payload: node,
  });
};

export default function reducer(state = initialState, action: Action<any>) {
  switch (action.type) {
    case ActionType.SET_CLIENT:
      return {
        ...state,
        client: action.payload,
      };
    case ActionType.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
}

export const useZkitter = (): Zkitter | null => {
  return useSelector((state: AppRootState) => {
    return state.zkitter.client;
  }, deepEqual);
};
