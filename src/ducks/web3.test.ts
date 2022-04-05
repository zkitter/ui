import sinon from 'sinon';
import {store, ducks, web3Stub, fetchStub, postWorkMessageStub} from "../util/testUtils";

const {
    web3: {
        connectWeb3,
        setWeb3,
        loginGun,
        genSemaphore,
        updateIdentity,
        web3Modal,
    },
} = ducks;

describe('Web3 Duck', () => {

    it('should set web3', async () => {
        sinon.stub(web3Modal, 'clearCachedProvider');
        sinon.stub(web3Modal, 'connect').returns(Promise.resolve(null));
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({ payload: {
                    joinedTx: 'hello',
            }}),
        }));

        try {
            // @ts-ignore
            await store.dispatch(connectWeb3());
        } catch (e) {
            expect(e.message).toBe('Provider not set or invalid');
        }

        // @ts-ignore
        await store.dispatch(setWeb3(web3Stub, '0x0000000000000000000000000000000000000000'));

        expect(store.getState().web3.account).toBe('0x0000000000000000000000000000000000000000');
        expect(store.getState().web3.networkType).toBe('main');

        const onAccountChange = web3Stub.currentProvider.on.args[0][1];
        const onNetworkChange = web3Stub.currentProvider.on.args[1][1];

        web3Stub.eth.getAccounts.returns(['0x0000000000000000000000000000000000000001']);
        web3Stub.eth.net.getNetworkType.returns('test');

        await onAccountChange(['0x0000000000000000000000000000000000000001']);
        await onNetworkChange();

        expect(store.getState().web3.account).toBe('0x0000000000000000000000000000000000000001');
        expect(store.getState().web3.networkType).toBe('test');

        fetchStub.reset();
    });

    it('should login gun', async () => {
        // @ts-ignore
        const result = await store.dispatch(loginGun());
        const pub = 'Ex4tafFuBZQXO610uL0v76bNnYokD7m-WBKFSYdOw6k.m0KmwZKFnqe-5iFOj_VIR50_BHtQDFceK7cF-Fi_-As';
        const priv = '47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU';

        expect(postWorkMessageStub.args[0][0])
            .toStrictEqual({
                type: 'serviceWorker/identity/setIdentity',
                payload: {
                    type: 'gun',
                    address: '0x0000000000000000000000000000000000000001',
                    publicKey: pub,
                    privateKey: priv,
                    nonce: 0,
                },
            });
        expect(result).toStrictEqual({ priv, pub });
        postWorkMessageStub.reset();
    });

    it('should gen semaphore', async () => {
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            json: async () => ({
                payload: {
                    data: {
                        siblings: [],
                        pathIndices: [],
                        root: '3',
                    },
                    name: '',
                    provider: '',
                },
            })
        }))
        // @ts-ignore
        const result = await store.dispatch(genSemaphore('Twitter'));
        expect(postWorkMessageStub.args[0][0])
            .toStrictEqual({
                type: 'serviceWorker/identity/setIdentity',
                payload: {
                    type: 'interrep',
                    address: '0x0000000000000000000000000000000000000001',
                    nonce: 0,
                    provider: 'Twitter',
                    name: '',
                    identityPath: {
                        path_elements: [],
                        path_index: [],
                        root: BigInt(3),
                    },
                    identityCommitment: '13918226946525796188065125653551272759560533101256756969470448137974823773959',
                    serializedIdentity: '{"identityNullifier":"aa3fda7fc5f0d2d2b8322bcc0367a1de25929526568dd90dc3b1891138425b00","identityTrapdoor":"bc63a4fcddf77544f4cedc29c394a72c1a1d134e3693f74d99ec4dffb6bf802a","secret":["aa3fda7fc5f0d2d2b8322bcc0367a1de25929526568dd90dc3b1891138425b00","bc63a4fcddf77544f4cedc29c394a72c1a1d134e3693f74d99ec4dffb6bf802a"]}'
                }
            });
        expect(result).toBeTruthy();
        fetchStub.reset();
        postWorkMessageStub.reset();
    });

    it('should update identity', async () => {
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            status: 200,
            json: async () => ({
                payload: {
                    transactionHash: '0xhash',
                },
            }),
        }));
        // @ts-ignore
        await store.dispatch(updateIdentity('0xpubkey'));
        expect(fetchStub.args[0][0])
            .toBe('http://127.0.0.1:3000/v1/users');
        fetchStub.reset();
    });
});