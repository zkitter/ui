import deepEqual from 'fast-deep-equal';
import { useSelector } from 'react-redux';
import { Dispatch } from 'redux';

import { Identity } from '../serviceWorkers/identity';
import { getIdentities, getIdentityStatus } from '../serviceWorkers/util';
import { AppRootState } from '../store/configureAppStore';
import { postWorkerMessage } from '../util/sw';

export enum ActionType {
  SET_SELECTED_ID = 'worker/setSelectedId',
  SET_IDENTITIES = 'worker/setIdentities',
  SET_UNLOCKED = 'worker/setUnlocked',
  SET_POSTING_GROUP = 'worker/setPostingGroup',
}

export type Action<payload> = {
  type: ActionType;
  payload?: payload;
  meta?: any;
  error?: boolean;
};

export type State = {
  unlocked: boolean;
  selected: Identity | null;
  identities: Identity[];
  postingGroup: string;
};

const initialState: State = {
  unlocked: false,
  selected: null,
  identities: [],
  postingGroup: '',
};

export const syncWorker = () => async (dispatch: Dispatch) => {
  const identities = await postWorkerMessage<Identity[]>(getIdentities());
  const { unlocked, currentIdentity } = await postWorkerMessage<{
    unlocked: boolean;
    currentIdentity: Identity | null;
  }>(getIdentityStatus());

  dispatch(setIdentities(identities));
  dispatch(setUnlocked(unlocked));

  if (currentIdentity) {
    if (currentIdentity.type === 'gun' && !currentIdentity.privateKey) return;
    if (currentIdentity.type === 'interrep' && !currentIdentity.serializedIdentity) return;
    dispatch(setSelectedId(currentIdentity));
    return currentIdentity;
  }
};

export const setIdentities = (identities: Identity[]): Action<Identity[]> => ({
  type: ActionType.SET_IDENTITIES,
  payload: identities,
});

export const setUnlocked = (unlocked: boolean): Action<boolean> => ({
  type: ActionType.SET_UNLOCKED,
  payload: unlocked,
});

export const setSelectedId = (id: Identity | null): Action<Identity | null> => ({
  type: ActionType.SET_SELECTED_ID,
  payload: id,
});

export const setPostingGroup = (id: string): Action<string> => ({
  type: ActionType.SET_POSTING_GROUP,
  payload: id,
});

export const useIdentities = () => {
  return useSelector((state: AppRootState) => {
    return state.worker.identities;
  }, deepEqual);
};

export const useWorkerUnlocked = () => {
  return useSelector((state: AppRootState) => {
    return state.worker.unlocked;
  }, deepEqual);
};

export const usePostingGroup = () => {
  return useSelector((state: AppRootState) => {
    return state.worker.postingGroup;
  }, deepEqual);
};

export const useSelectedLocalId = () => {
  return useSelector((state: AppRootState) => {
    const {
      worker: { selected },
    } = state;

    if (selected) {
      return selected;
    }

    return null;
  }, deepEqual);
};

export const getZKGroupFromIdentity = (id: Identity) => {
  if (id?.type !== 'interrep' && id?.type !== 'zkpr_interrep' && id?.type !== 'taz') {
    return null;
  }

  if (id?.type === 'taz') {
    return 'semaphore_taz_members';
  }

  return `interrep_${id.provider.toLowerCase()}_${id.name.toLowerCase()}`;
};

export const useSelectedZKGroup = () => {
  return useSelector((state: AppRootState) => {
    const {
      worker: { selected },
    } = state;

    if (selected?.type === 'taz') return 'semaphore_taz_members';

    if (selected?.type !== 'interrep' && selected?.type !== 'zkpr_interrep') {
      return null;
    }

    if (!selected.provider || !selected.name) return '';

    return `interrep_${selected.provider.toLowerCase()}_${selected.name.toLowerCase()}`;
  }, deepEqual);
};

export const useHasIdConnected = () => {
  return useSelector((state: AppRootState) => {
    const {
      worker: { selected },
    } = state;
    const {
      web3: { account },
    } = state;

    if (selected?.address === account) {
      return true;
    }

    return false;
  }, deepEqual);
};

export default function worker(state = initialState, action: Action<any>): State {
  switch (action.type) {
    case ActionType.SET_IDENTITIES:
      return {
        ...state,
        identities: action.payload,
      };
    case ActionType.SET_SELECTED_ID:
      return {
        ...state,
        selected: action.payload,
        postingGroup: '',
      };
    case ActionType.SET_UNLOCKED:
      return {
        ...state,
        unlocked: action.payload,
      };
    case ActionType.SET_POSTING_GROUP:
      return {
        ...state,
        postingGroup: action.payload,
      };
    default:
      return state;
  }
}
