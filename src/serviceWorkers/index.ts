// @ts-ignore

import {AppService} from "../util/svc";
import {IdentityService, Identity} from "./identity";
import {ServiceWorkerActionType, WorkerAction, WorkerResponse} from "./util";

const global: ServiceWorkerGlobalScope = self as any;

let root: null | AppService = null;
let appStartPromise: null | Promise<AppService> = null;


async function getApp(): Promise<AppService> {
    if (root) {
        return root;
    }

    if (appStartPromise) {
        root = await appStartPromise;
        return root;
    }

    appStartPromise = new Promise(async (resolve) => {
        const app = new AppService();

        app.add('identity', new IdentityService());

        await app.start();

        resolve(app);
    });

    return appStartPromise;
}

const cacheName = 'autism-pwa-v3';
const filesToCache = [
    '/index.html',
    '/app.js',
];

global.addEventListener('install', (e) => {
    e.waitUntil(
        new Promise(async resolve => {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => {
                if (cacheName !== name) {
                    console.log(cacheName, name);
                    return caches.delete(name);
                }
            }));
            resolve();
        })
    );
});

global.addEventListener('fetch', (e) => {
    e.respondWith(
        new Promise(async resolve => {
            caches.match(e.request).then(async (response) => {
                // if (response) {
                //     return resolve(response);
                // }

                fetch(e.request).then(res => {
                    const url = new URL(e.request.url);

                    if (url.origin === global.origin && filesToCache.indexOf(url.pathname) > -1) {
                        // caches.open(cacheName).then(cache => {
                        //     cache.put(e.request, res);
                        // });
                    }

                    return resolve(res.clone());
                });
            })
        })
    )
});

global.addEventListener('activate', (e) => {
    e.waitUntil(
        new Promise(async resolve => {
            await getApp();
            resolve();
        })
    );
});

global.addEventListener('message', async (e) => {
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


