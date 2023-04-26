import { Action, safeJsonParse } from '~/misc';
import { Dispatch } from 'redux';
import { useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { AppRootState } from '../store/configureAppStore';

export const OB_REP_LS_KEY = 'zkitter/onboarding/reps';

enum ActionTypes {
  UPDATE_REP = 'zkitter/onboarding/UPDATE_REP',
  SET_REPS = 'zkitter/onboarding/SET_REPS',
}

export type Reputation = {
  provider: string;
  reputation: string;
  token: string;
  username: string;
};

export type ReputationMap = {
  [groupId: string]: Reputation;
};

type State = {
  reputations: ReputationMap;
};

const initialState: State = {
  reputations: loadReputationFromLS(),
};

export const loadRep = () => (dispatch: Dispatch) => {
  dispatch({
    type: ActionTypes.SET_REPS,
    payload: loadReputationFromLS(),
  });
};

export const removeRep = (rep: Reputation) => (dispatch: Dispatch) => {
  const existing = loadReputationFromLS();
  const groupId = repToGroupId(rep);
  if (existing[groupId]) delete existing[groupId];
  localStorage.setItem(OB_REP_LS_KEY, JSON.stringify(existing));
  dispatch({
    type: ActionTypes.SET_REPS,
    payload: existing,
  });
};

export const saveRep = (rep: Reputation) => (dispatch: Dispatch) => {
  const existing = loadReputationFromLS();
  existing[repToGroupId(rep)] = rep;
  localStorage.setItem(OB_REP_LS_KEY, JSON.stringify(existing));
  dispatch({
    type: ActionTypes.UPDATE_REP,
    payload: rep,
  });
};

export default function onboarding(state = initialState, action: Action<any>): State {
  switch (action.type) {
    case ActionTypes.UPDATE_REP: {
      const rep = action.payload as Reputation;
      return {
        ...state,
        reputations: {
          ...state.reputations,
          [repToGroupId(rep)]: rep,
        },
      };
    }
    case ActionTypes.SET_REPS: {
      const reps = action.payload as ReputationMap;
      return {
        ...state,
        reputations: reps,
      };
    }
    default:
      return state;
  }
}

export const useOnboardingReputations = () => {
  return useSelector((state: AppRootState) => {
    return state.onboarding.reputations;
  }, deepEqual);
};

export const repToGroupId = (rep: Reputation) => `zkitter_${rep.provider}_${rep.reputation}`;

function loadReputationFromLS(): ReputationMap {
  const map: ReputationMap = {};

  const raw = localStorage.getItem(OB_REP_LS_KEY);
  const json = raw && safeJsonParse(raw);

  try {
    for (const val of Object.values(json)) {
      if (validateRepJSON(val)) {
        const rep = val as Reputation;
        map[repToGroupId(rep)] = rep;
      }
    }
  } catch (e) {}

  return map;
}

export function validateRepJSON(data: any) {
  if (typeof data !== 'object') return false;

  const { provider, reputation, token, username } = data;

  if (!provider || typeof provider !== 'string') return false;
  if (!reputation || typeof reputation !== 'string') return false;
  if (!token || typeof token !== 'string') return false;
  if (!username || typeof username !== 'string') return false;

  return true;
}
