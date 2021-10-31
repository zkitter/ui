import {WorkerAction} from "../serviceWorkers/util";

let nonce = 0;
const promises: {[nonce: number]: any} = {};

export async function createServiceWorker() {
    return new Promise((resolve) => {
        window.addEventListener('load', async function() {
            await navigator.serviceWorker.register('/serviceWorker.js');

            navigator.serviceWorker.addEventListener('message', event => {
                const data = event.data;

                if (!data) return;

                if (data.target === 'rpc') {
                    const response = data.response;
                    const promise = promises[response.nonce];

                    if (!promise) return;

                    if (response.error) {
                        promise.reject(response.payload);
                    } else {
                        promise.resolve(response.payload);
                    }

                    delete promises[response.nonce];
                }
            });

            resolve();
        });
    })
}

export async function postWorkerMessage(workerAction: WorkerAction<any>): Promise<any> {
    return new Promise((resolve, reject) => {
        navigator.serviceWorker.controller?.postMessage({
            ...workerAction,
            target: 'autism-web',
            nonce: nonce,
        });

        promises[nonce] = { resolve, reject };

        nonce++;
    });
}