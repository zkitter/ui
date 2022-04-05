import {ducks, fetchReset, fetchStub, store} from "../util/testUtils";
import {createEditorStateWithText} from "@draft-js-plugins/editor";
import {ZkIdentity} from "@zk-kit/identity";

const {
    setMirror,
    submitConnection,
    submitModeration,
    submitPost,
    submitProfile,
    submitRepost,
    setDraft,
} = ducks.drafts;

const {
    setSelectedId,
} = ducks.worker;

describe('Drafts Duck', () => {
    it('should initialize state', () => {
        expect(store.getState().drafts).toStrictEqual({ map: {}, mirror: false, submitting: false });
    });

    it('should submit post', async () => {
        store.dispatch(setDraft({
            reference: '',
            editorState: createEditorStateWithText('hello world!'),
        }));
        store.dispatch(setMirror(true));
        // @ts-ignore
        const post: any = await store.dispatch(submitPost(''));
        expect(post.payload).toStrictEqual({
            "attachment": "",
            "content": "hello world!",
            "reference": "",
            "title": "",
            "topic": "ok",
        });
        expect(fetchStub.args[0]).toStrictEqual(["http://127.0.0.1:3000/twitter/update", {"body": "{\"status\":\"hello world!\"}", "credentials": "include", "headers": {"Content-Type": "application/json"}, "method": "POST"}]);
        fetchReset();
    });

    it('should submit semaphore post', async () => {
        const zkIdentity = new ZkIdentity();
        const identityCommitment = '0x' + zkIdentity.genIdentityCommitment().toString(16);
        store.dispatch(setSelectedId({
            type: 'interrep',
            address: '0xmyaddress',
            nonce: 0,
            provider: 'autism',
            name: 'diamond',
            identityPath: {
                path_elements: ['0x0', '0x1'],
                path_index: [0, 1],
                root: '0xroothash',
            },
            identityCommitment,
            serializedIdentity: zkIdentity.serializeIdentity(),
        }))
        store.dispatch(setDraft({
            reference: '0xparenthash',
            editorState: createEditorStateWithText('reply world!'),
        }));
        store.dispatch(setMirror(false));
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            status: 200,
            json: async () => ({
                payload: {
                    data: {
                        siblings: ['0x00', '0x01'],
                        pathIndices: [0, 1],
                        root: '0x00',
                    },
                    name: '',
                    provider: '',
                },
            }),
        }));
        // @ts-ignore
        const post: any = await store.dispatch(submitPost('0xparenthash'));
        expect(post.payload).toStrictEqual({
            "attachment": "",
            "content": "reply world!",
            "reference": "0xparenthash",
            "title": "",
            "topic": "",
        });
        expect(fetchStub.args[0][0]).toBe(`http://127.0.0.1:3000/interrep/${identityCommitment}`);
        fetchReset();
    });

    it('should submit zkpr semaphore post', async () => {
        const zkIdentity = new ZkIdentity();
        const identityCommitment = '0x' + zkIdentity.genIdentityCommitment().toString(16);
        store.dispatch(setSelectedId({
            type: 'zkpr_interrep',
            provider: 'autism',
            name: 'diamond',
            identityPath: {
                path_elements: ['0x0', '0x1'],
                path_index: [0, 1],
                root: '0xroothash',
            },
            identityCommitment,
        }))
        store.dispatch(setDraft({
            reference: '0xparenthash1',
            editorState: createEditorStateWithText('reply world!!'),
        }));
        store.dispatch(setMirror(false));
        // @ts-ignore
        fetchStub.returns(Promise.resolve({
            status: 200,
            json: async () => ({
                payload: {
                    data: {
                        siblings: ['0x00', '0x01'],
                        pathIndices: [0, 1],
                        root: '0x00',
                    },
                    name: '',
                    provider: '',
                },
            }),
        }));
        // @ts-ignore
        const post: any = await store.dispatch(submitPost('0xparenthash1'));
        expect(post.payload).toStrictEqual({
            "attachment": "",
            "content": "reply world!!",
            "reference": "0xparenthash1",
            "title": "",
            "topic": "",
        });
        expect(fetchStub.args[0][0]).toBe(`http://127.0.0.1:3000/interrep/${identityCommitment}`);
        fetchReset();
        store.dispatch(setSelectedId({
            type: 'gun',
            address: '0xmyaddress',
            nonce: 0,
            publicKey: '0xpubkey',
            privateKey: '0xprivkey',
        }));
    });

    it('should submit repost', async () => {
        // @ts-ignore
        const post: any = await store.dispatch(submitRepost('0xreposthash'));
        expect(post.subtype).toBe('REPOST');
        expect(post.payload).toStrictEqual({
            "attachment": "",
            "content": "",
            "reference": "0xreposthash",
            "title": "",
            "topic": "",
        });
    });

    it('should submit moderation', async () => {
        // @ts-ignore
        const mod: any = await store.dispatch(submitModeration('0xmodhash', 'LIKE'));
        expect(mod.subtype).toBe('LIKE');
        expect(mod.payload).toStrictEqual({
            "reference": "0xmodhash",
        });
    });

    it('should submit connection', async () => {
        // @ts-ignore
        const conn: any = await store.dispatch(submitConnection('0xotheruser', 'BLOCK'));
        expect(conn.subtype).toBe('BLOCK');
        expect(conn.payload).toStrictEqual({
            "name": "0xotheruser",
        });
    });

    it('should submit profile', async () => {
        // @ts-ignore
        const pf: any = await store.dispatch(submitProfile('PROFILE_IMAGE', 'image'));
        expect(pf.subtype).toBe('PROFILE_IMAGE');
        expect(pf.payload).toStrictEqual({
            key: "",
            value: "image",
        });
    });

});