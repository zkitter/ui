import {store} from "../util/testUtils";

test('store - should initialize', async () => {
    expect(store.getState()).toStrictEqual({
        web3: {
            web3: null,
            account: '',
            networkType: '',
            ensName: '',
            loading: false,
            fetchingENS: false,
            unlocking: false,
            gun: { pub: '', priv: '', nonce: 0, joinedTx: '' },
            semaphore: {
                nonce: 0,
                keypair: {
                    privKey: null,
                    pubKey: '',
                },
                commitment: null,
                identityNullifier: null,
                identityTrapdoor: null,
                identityPath: null
            },
            pending: { createRecordTx: {} }
        },
        zkpr: { zkpr: null, idCommitment: '', loading: false, unlocking: false },
        posts: { map: {}, meta: {} },
        users: { map: {} },
        drafts: { submitting: false, mirror: false, map: {} },
        worker: { unlocked: false, selected: null, identities: [] },
        mods: { posts: {} }
    });
});
