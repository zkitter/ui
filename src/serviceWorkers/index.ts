// @ts-ignore

import {AppService} from "../util/svc";
import {IdentityService, Identity} from "./identity";
import {ServiceWorkerActionType, WorkerAction, WorkerResponse} from "./util";

const global: ServiceWorkerGlobalScope = self as any;

let root: null | AppService = null;

async function getApp() {
    if (root) {
        return root;
    }

    const app = new AppService();

    app.add('identity', new IdentityService());

    await app.start();

    root = app;

    return root;

}

global.addEventListener('activate', async () => {
    console.log('activate');
    await getApp();
});

global.addEventListener('message', async (e) => {
    console.log('worker received', e);
    const action: WorkerAction<any> = e.data;

    if (!action || action.target !== 'autism-web' || !e.source) {
        return;
    }

    const client = e.source;

    // @ts-ignore
    const handler = handlers[action?.type];
    const nonce = action.nonce;
    const app = await getApp();

    try {
        const payload = await handler(app, action);
        const resp: WorkerResponse<any> = {
            payload: payload,
            nonce: nonce as number,
        };
        // @ts-ignore
        client.postMessage({
            target: 'rpc',
            response: resp,
        });
    } catch (e) {
        const resp: WorkerResponse<any> = {
            payload: e.message,
            nonce: nonce as number,
            error: true,
        };
        // @ts-ignore
        client.postMessage({
            target: 'rpc',
            response: resp,
        });
    }
});

const handlers = {
    [ServiceWorkerActionType.GET_IDENTITIES]: async (app: AppService, action: WorkerAction<string>) => {
        return app.exec('identity', 'getIdentities');
    },

    [ServiceWorkerActionType.GET_IDENTITY]: async (app: AppService, action: WorkerAction<string>) => {
        return app.exec('identity', 'getIdentityByAddress', action.payload);
    },

    [ServiceWorkerActionType.ADD_IDENTITY]: async (app: AppService, action: WorkerAction<Identity>) => {
        return app.exec('identity', 'addIdentity', action.payload);
    },

    [ServiceWorkerActionType.SET_IDENTITY]: async (app: AppService, action: WorkerAction<Identity>) => {
        return app.exec('identity', 'setIdentity', action.payload);
    },

    [ServiceWorkerActionType.SELECT_IDENTITY]: async (app: AppService, action: WorkerAction<string>) => {
        return app.exec('identity', 'selectIdentity', action.payload);
    },

    [ServiceWorkerActionType.GET_CURRENT_IDENTITY]: async (app: AppService) => {
        return app.exec('identity', 'getCurrentIdentity');
    },

    [ServiceWorkerActionType.SET_PASSPHRASE]: async (app: AppService, action: WorkerAction<string>) => {
        return app.exec('identity', 'setPassphrase', action.payload);
    },

    [ServiceWorkerActionType.GET_IDENTITY_STATUS]: async (app: AppService, action: WorkerAction<string>) => {
        return app.exec('identity', 'getStatus');
    },
};


