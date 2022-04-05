import {pushReduxActionStub} from "../util/testUtils";
import {IdentityService} from "./identity";
import {ZkIdentity} from "@zk-kit/identity";

describe('Identity Service', () => {
    const identity = new IdentityService();

    it('should init service', async () => {
        await identity.start();
        expect(await identity.getStatus())
            .toStrictEqual({ unlocked: false, currentIdentity: null });
        expect(pushReduxActionStub.args[0][0])
            .toStrictEqual({ type: 'worker/setUnlocked', payload: false });
    });

    it('should set passphase', async () => {
        await identity.setPassphrase('test1234');
        expect(await identity.readPassphrase()).toBe('test1234');
    });

    it('should add identities', async () => {
        const id = new ZkIdentity();
        const id2 = new ZkIdentity();
        await identity.addIdentity({
            type: 'interrep',
            nonce: 0,
            address: '0xinterrep',
            provider: 'twitter',
            name: 'diamond',
            identityPath: {
                path_elements: ['0x1', '0x2'],
                path_index: [1,2],
                root: '0x4',
            },
            identityCommitment: id.genIdentityCommitment().toString(16),
            serializedIdentity: await id.serializeIdentity(),
        });
        await identity.addIdentity({
            type: 'gun',
            nonce: 0,
            address: '0xgun',
            privateKey: '0xpriv',
            publicKey: '0xpub',
        });
        await identity.addIdentity({
            type: 'zkpr_interrep',
            provider: 'github',
            name: 'diamond',
            identityPath: {
                path_elements: ['0x2', '0x3'],
                path_index: [2, 3],
                root: '0x5',
            },
            identityCommitment: id2.genIdentityCommitment().toString(16),
        });
        await identity.selectIdentity('0xpub');

        const expectedGunId = {
            "address": "0xgun",
            "identityCommitment": "",
            "identityPath": "",
            "name": "",
            "nonce": 0,
            "privateKey": "0xpriv",
            "provider": "",
            "publicKey": "0xpub",
            "serializedIdentity": "",
            "type": "gun",
        };

        expect(await identity.getStatus()).toStrictEqual({
            "currentIdentity": expectedGunId,
            "unlocked": true,
        });

        expect(await identity.getIdentityByAddress('0xgun')).toStrictEqual({
            ...expectedGunId,
            "privateKey": expect.stringContaining('='),
        });

        await identity.selectIdentity(id.genIdentityCommitment().toString(16));

        expect(await identity.getStatus()).toStrictEqual({
            "currentIdentity": {
                address: '0xinterrep',
                type: 'interrep',
                nonce: 0,
                publicKey: '',
                privateKey: '',
                provider: 'twitter',
                name: 'diamond',
                identityPath: {
                    path_elements: ['0x1', '0x2'],
                    path_index: [1,2],
                    root: '0x4',
                },
                identityCommitment: id.genIdentityCommitment().toString(16),
                serializedIdentity: await id.serializeIdentity(),
            },
            "unlocked": true,
        });
    });
});