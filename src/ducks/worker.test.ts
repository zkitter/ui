import {store, ducks, postWorkMessageStub} from "../util/testUtils";
import {Identity} from "../serviceWorkers/identity";
import {ServiceWorkerActionType} from "../serviceWorkers/util";

const {
    worker: {
        syncWorker,
    }
} = ducks;

describe('Worker Duck', () => {
    it('should sync worker', async () => {
        const identities: Identity[] = [
            {
                type: 'gun',
                address: '0xgunaddress',
                nonce: 0,
                publicKey: '0xpub',
                privateKey: '0xpriv',
            },
            {
                type: 'zkpr_interrep',
                provider: 'Twitter',
                name: 'diamond',
                identityPath: {
                    path_elements: ['0x1', '0x2'],
                    path_index: [0, 1],
                    root: '0x123',
                },
                identityCommitment: '0x12345',
            }
        ];

        postWorkMessageStub
            .withArgs({ type: ServiceWorkerActionType.GET_IDENTITIES })
            .returns(Promise.resolve(identities));

        postWorkMessageStub
            .withArgs({ type: ServiceWorkerActionType.GET_IDENTITY_STATUS })
            .returns(Promise.resolve({ unlocked: true, currentIdentity: identities[0]}));


        // @ts-ignore
        const id = await store.dispatch(syncWorker());
        expect(id).toStrictEqual(identities[0]);
        postWorkMessageStub.reset();
    });
});