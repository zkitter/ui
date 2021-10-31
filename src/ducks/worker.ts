import {Identity} from "../serviceWorkers/identity";
import {Dispatch} from "redux";
import {postWorkerMessage} from "../util/sw";
import {getIdentities, getIdentityStatus} from "../serviceWorkers/util";
import {useSelector} from "react-redux";
import {AppRootState} from "../store/configureAppStore";
import deepEqual from "fast-deep-equal";

export enum ActionType {
    SET_IDENTITIES = 'worker/setIdentities',
    SET_UNLOCKED = 'worker/setUnlocked',
}

export type Action<payload> = {
    type: ActionType;
    payload?: payload;
    meta?: any;
    error?: boolean;
}

export type State = {
    unlocked: boolean;
    identities: Identity[];
}

const initialState: State = {
    unlocked: false,
    identities: [],
};

export const syncWorker = () => async (dispatch: Dispatch) => {
    const identities = await postWorkerMessage(getIdentities());
    const {unlocked} = await postWorkerMessage(getIdentityStatus());
    dispatch(setIdentities(identities));
    dispatch(setUnlocked(unlocked));
}

export const setIdentities = (identities: Identity[]): Action<Identity[]> => ({
    type: ActionType.SET_IDENTITIES,
    payload: identities,
});

export const setUnlocked = (unlocked: boolean): Action<boolean> => ({
    type: ActionType.SET_UNLOCKED,
    payload: unlocked,
});


export default function worker(state = initialState, action: Action<any>): State {
    switch (action.type) {
        case ActionType.SET_IDENTITIES:
            return {
                ...state,
                identities: action.payload,
            };
        case ActionType.SET_UNLOCKED:
            return {
                ...state,
                unlocked: action.payload,
            };
        default:
            return state;
    }
}

export const useIdentities = () => {
    return useSelector((state: AppRootState) => {
        return state.worker.identities;
    }, deepEqual);
}

export const useWorkerUnlocked = () => {
    return useSelector((state: AppRootState) => {
        return state.worker.unlocked;
    }, deepEqual);
}