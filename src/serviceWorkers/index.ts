// @ts-ignore

import {AppService} from "../util/svc";
import {IdentityService, Identity} from "./identity";
import {ServiceWorkerActionType, WorkerAction, WorkerResponse} from "./util";

const global: ServiceWorkerGlobalScope = self as any;

global.addEventListener('activate', async () => {
    const app = new AppService();

    app.add('identity', new IdentityService());

    await app.start();

    self.addEventListener('message', async (e) => {
        const action: WorkerAction<any> = e.data;

        if (!action || action.target !== 'autism-web' || !e.source) {
            return;
        }

        // @ts-ignore
        const handler = handlers[action?.type];
        const nonce = action.nonce;

        try {
            const payload = await handler(app, action);
            const resp: WorkerResponse<any> = {
                payload: payload,
                nonce: nonce as number,
            };
            // @ts-ignore
            e.source.postMessage({
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
            e.source.postMessage({
                target: 'rpc',
                response: resp,
            });
        }
    });
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

    [ServiceWorkerActionType.SET_PASSPHRASE]: async (app: AppService, action: WorkerAction<string>) => {
        return app.exec('identity', 'setPassphrase', action.payload);
    },

    [ServiceWorkerActionType.GET_IDENTITY_STATUS]: async (app: AppService, action: WorkerAction<string>) => {
        return app.exec('identity', 'getStatus');
    },
};


