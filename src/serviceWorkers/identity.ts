import {GenericService} from "../util/svc";
import {decrypt, encrypt} from "../util/encrypt";
import {pushReduxAction} from "./util";
import {setIdentities, setUnlocked} from "../ducks/worker";

export type Identity = {
    type: 'gun',
    address: string;
    nonce: number;
    publicKey: string;
    privateKey: string;
}

const STORAGE_KEY = 'identity_ls';

export class IdentityService extends GenericService {
    passphrase: string;

    currentIdentity: Identity | null;

    db?: IDBDatabase;

    constructor() {
        super();
        this.passphrase = '';
        this.currentIdentity = null;
    }

    ensure() {
        if (!this.db) {
            throw new Error('identity db is not initialized');
        }
    }

    async start() {
        const req = indexedDB.open(STORAGE_KEY, 1);

        req.onupgradeneeded = () => {
            const db = req.result;
            const store = db.createObjectStore('identity', { keyPath: 'public_key' });
            store.createIndex('by_address', 'address');
            this.db = db;
        }

        req.onsuccess = async () => {
            this.db = req.result;
        }

    }

    async getStatus() {
        this.ensure();
        const identities = await this.getIdentities();

        return {
            unlocked: !!this.passphrase,
            currentIdentity: identities.length
                ? this.currentIdentity || identities[0]
                : null,
        };
    }

    async setPassphrase(passphrase: string) {
        this.ensure();
        const identities = await this.getIdentities({ danger: true });

        for (let id of identities) {
            decrypt(id.privateKey, passphrase);
        }

        this.passphrase = passphrase
        await pushReduxAction(setUnlocked(true));
    }

    async addIdentity(identity: Identity) {
        this.ensure();

        if (!this.passphrase) throw new Error('identity store is locked');
        if (!identity.publicKey) throw new Error('missing publicKey');
        if (!identity.privateKey) throw new Error('missing privateKey');
        if (typeof identity.nonce !== 'number') throw new Error('invalid nonce');

        const tx = this.db?.transaction("identity", "readwrite");
        const store = tx?.objectStore("identity");

        store?.put({
            type: identity.type,
            address: identity.address,
            nonce: identity.nonce,
            public_key: identity.publicKey,
            private_key: encrypt(identity.privateKey, this.passphrase),
        });

        await pushReduxAction(setIdentities(await this.getIdentities()));
    }

    async getIdentityByAddress(address: string) {
        this.ensure();
        return new Promise(async (resolve, reject) => {
            const tx = this.db?.transaction("identity", "readwrite");
            const store = tx?.objectStore("identity");
            const index = store?.index("by_address");

            if (!index) return reject();

            const request = index.get(address);

            request.onsuccess = () => {
                const id = request.result;

                if (!id) {
                    resolve();
                    return;
                }

                resolve({
                    address: id.address,
                    type: id.type,
                    nonce: id.nonce,
                    publicKey: id.public_key,
                    privateKey: '',
                });
            }
        });
    }

    async getIdentities(opt?: {danger: boolean}): Promise<Identity[]> {
        this.ensure();
        return new Promise(async (resolve, reject) => {
            const tx = this.db?.transaction("identity", "readwrite");
            const store = tx?.objectStore("identity");
            const request = store?.getAll();

            if (!request) return reject();

            request.onsuccess = () => {
                const ids: Identity[] = (request.result || [])
                    .map((id: any) => {
                        return {
                            address: id.address,
                            type: id.type,
                            nonce: id.nonce,
                            publicKey: id.public_key,
                            privateKey: opt?.danger ? id.private_key : '',
                        }
                    });
                resolve(ids);
            }
        });
    }
}