import {GenericService} from "../util/svc";
import {decrypt, encrypt} from "../util/encrypt";
import {pushReduxAction} from "./util";
import {setIdentities, setSelectedId, setUnlocked} from "../ducks/worker";

export type GunIdentity = {
    type: 'gun',
    address: string;
    nonce: number;
    publicKey: string;
    privateKey: string;
}

export type InterrepIdentity = {
    type: 'interrep',
    address: string;
    nonce: number;
    provider: string;
    name: string;
    identityPath: {
        path_elements: string[];
        path_index: number[];
        root: string;
    } | null;
    identityCommitment: string;
    serializedIdentity: string;
}

export type Identity =
    | GunIdentity
    | InterrepIdentity;

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

    async ensure() {
        // this.db = await this.getDB();
        if (!this.db) {
            throw new Error('identity db is not initialized');
        }
    }

    async getDB(): Promise<IDBDatabase> {
        return new Promise(async (resolve) => {
            const req = indexedDB.open(STORAGE_KEY, 1);

            req.onupgradeneeded = () => {
                const db = req.result;
                const store = db.createObjectStore(
                    'identity',
                    {
                        keyPath: 'public_key',
                    }
                );
                store.createIndex('by_address', 'address');
                resolve(db);
            }

            req.onsuccess = async () => {
                resolve(req.result);
            }
        })
    }

    async start() {
        this.db = await this.getDB();
    }

    async getStatus() {
        await this.ensure();

        return {
            unlocked: !!this.passphrase,
            currentIdentity: this.currentIdentity,
        };
    }

    async getCurrentIdentity() {
        return this.currentIdentity;
    }

    wrapIdentity(id: Identity): Identity {
        if (id.type === 'gun') {
            return {
                ...id,
                privateKey: this.passphrase
                    ? decrypt(id.privateKey, this.passphrase)
                    : '',
            }
        }

        return id;
    }

    async setPassphrase(passphrase: string) {
        await this.ensure();
        const identities = await this.getIdentities();

        for (let id of identities) {
            if (id.type === 'gun') {
                if (!decrypt(id.privateKey, passphrase)) {
                    throw new Error('invalid passphrase');
                }
            }
        }

        this.passphrase = passphrase
        await pushReduxAction(setUnlocked(true));
    }

    async setIdentity(identity: Identity | null) {
        this.currentIdentity = identity;
        await pushReduxAction(setSelectedId(identity));
        if (!identity) {
            this.passphrase = '';
            await pushReduxAction(setUnlocked(false));
        }
    }

    async selectIdentity(pubkey: string) {
        await this.ensure();
        const identities = await this.getIdentities();

        for (let id of identities) {
            if (id.type === 'gun') {
                if (id.publicKey === pubkey) {
                    this.currentIdentity = this.wrapIdentity(id);
                    await pushReduxAction(setSelectedId(this.currentIdentity));
                    return this.currentIdentity;
                }
            }

        }

        throw new Error(`cannot find identity with pubkey ${pubkey}`);
    }

    async addIdentity(identity: Identity) {
        await this.ensure();

        if (!this.passphrase) throw new Error('identity store is locked');
        if (typeof identity.nonce !== 'number') throw new Error('invalid nonce');

        const tx = this.db?.transaction("identity", "readwrite");
        const store = tx?.objectStore("identity");

        if (identity.type === 'gun') {
            if (!identity.publicKey) throw new Error('missing publicKey');
            if (!identity.privateKey) throw new Error('missing privateKey');

            store?.put({
                type: identity.type,
                address: identity.address,
                nonce: identity.nonce,
                public_key: identity.publicKey,
                private_key: encrypt(identity.privateKey, this.passphrase),
            });
        }

        await pushReduxAction(setIdentities(await this.getIdentities()));
    }

    async getIdentityByAddress(address: string) {
        await this.ensure();
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
                    privateKey: id.private_key,
                });
            }
        });
    }

    async getIdentities(): Promise<Identity[]> {
        await this.ensure();
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
                            privateKey: id.private_key,
                        }
                    });
                resolve(ids);
            }
        });
    }
}
