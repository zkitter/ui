import {Identity} from "./identity";
import {Action} from "redux";

export enum ServiceWorkerActionType {
    ADD_IDENTITY = 'serviceWorker/identity/addIdentity',
    SET_IDENTITY = 'serviceWorker/identity/setIdentity',
    SET_PASSPHRASE = 'serviceWorker/identity/setPassphrase',
    GET_IDENTITY = 'serviceWorker/identity/getIdentity',
    SELECT_IDENTITY = 'serviceWorker/identity/selectIdentity',
    GET_IDENTITIES = 'serviceWorker/identity/getIdentities',
    GET_IDENTITY_STATUS = 'serviceWorker/identity/getStatus',
}

export type WorkerAction<payload> = {
    type: ServiceWorkerActionType;
    payload?: payload;
    error?: boolean;
    meta?: any;
    target?: string;
    nonce?: number;
}

export type WorkerResponse<payload> = {
    payload?: payload;
    error?: boolean;
    nonce: number;
}

export const getIdentities = (): WorkerAction<any> => ({
    type: ServiceWorkerActionType.GET_IDENTITIES,
});

export const getIdentity = (account: string): WorkerAction<string> => ({
    type: ServiceWorkerActionType.GET_IDENTITY,
    payload: account,
});

export const addIdentity = (identity: Identity): WorkerAction<Identity> => ({
    type: ServiceWorkerActionType.ADD_IDENTITY,
    payload: identity,
});

export const setIdentity = (identity: Identity | null): WorkerAction<Identity | null> => ({
    type: ServiceWorkerActionType.SET_IDENTITY,
    payload: identity,
});

export const selectIdentity = (pubkey: string): WorkerAction<string> => ({
    type: ServiceWorkerActionType.SELECT_IDENTITY,
    payload: pubkey,
});

export const setPassphrase = (passphrase: string): WorkerAction<string> => ({
    type: ServiceWorkerActionType.SET_PASSPHRASE,
    payload: passphrase,
});

export const getIdentityStatus = (): WorkerAction<any> => ({
    type: ServiceWorkerActionType.GET_IDENTITY_STATUS,
});

export async function pushReduxAction(action: Action) {
    const global: ServiceWorkerGlobalScope = self as any;
    const clients = await global.clients.matchAll();
    for (let client of clients) {
        client.postMessage({
            target: 'redux',
            action: action,
        });
    }
}