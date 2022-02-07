import {GenericService} from "../util/svc";
import {decrypt, encrypt, randomSalt} from "../util/encrypt";
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

const STORAGE_KEY = 'identity_ls_2';
const PASSPHRASE = 'pid';
const SELECTED = 'selected_id';
const SALT = 'sid';

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
        if (!this.db) {
            throw new Error('identity db is not initialized');
        }

        const salt = await this.readKey(SALT);
        if (!salt) {
            await this.writeKey(SALT, randomSalt());
        }
    }

    async getDB(): Promise<IDBDatabase> {
        return new Promise(async (resolve) => {
            const req = indexedDB.open(STORAGE_KEY, 3);

            req.onupgradeneeded = (event) => {
                console.log(event);
                const db = req.result;

                if (event.oldVersion < 2) {
                    const store = db.createObjectStore(
                        'identity',
                        {
                            keyPath: ['public_key', 'identity_commitment'],
                        }
                    );
                    store.createIndex('by_address', 'address');
                }

                if (event.oldVersion < 3) {
                    const kvStore = db.createObjectStore(
                        'keyvalue',
                        {
                            keyPath: ['id'],
                        }
                    );
                    kvStore.createIndex('by_id', 'id');
                }

                resolve(db);
            }

            req.onsuccess = async () => {
                resolve(req.result);
            }
        });
    }

    async start() {
        this.db = await this.getDB();
        this.passphrase = await this.readPassphrase();
        await this.setPassphrase(this.passphrase);

        const selected = await this.readKey<string>(SELECTED);
        if (selected) {
            await this.selectIdentity(selected);
        }
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

        if (id.type === 'interrep') {
            return {
                ...id,
                serializedIdentity: this.passphrase
                    ? decrypt(id.serializedIdentity, this.passphrase)
                    : '',
            }
        }

        return id;
    }

    async testPassphrase(passphrase: string) {
        await this.ensure();
        const identities = await this.getIdentities();

        for (let id of identities) {
            if (id.type === 'gun') {
                if (!decrypt(id.privateKey, passphrase)) {
                    throw new Error('invalid passphrase');
                }
            }
        }
    }

    async setPassphrase(passphrase: string) {
        await this.testPassphrase(passphrase);
        await this.writePassphrase(passphrase);
    }

    async setIdentity(identity: Identity | null) {
        this.currentIdentity = identity;
        await pushReduxAction(setSelectedId(identity));
        if (!identity) {
            await this.writePassphrase('');
        }
    }

    async selectIdentity(pubkeyOrCommitment: string) {
        await this.ensure();
        const identities = await this.getIdentities();

        for (let id of identities) {
            if (id.type === 'gun') {
                if (id.publicKey === pubkeyOrCommitment) {
                    this.currentIdentity = this.wrapIdentity(id);
                    await pushReduxAction(setSelectedId(this.currentIdentity));
                    await this.writeKey(SELECTED, pubkeyOrCommitment);
                    return this.currentIdentity;
                }
            }

            if (id.type === 'interrep') {
                if (id.identityCommitment === pubkeyOrCommitment) {
                    this.currentIdentity = this.wrapIdentity(id);
                    await pushReduxAction(setSelectedId(this.currentIdentity));
                    await this.writeKey(SELECTED, pubkeyOrCommitment);
                    return this.currentIdentity;
                }
            }
        }

        throw new Error(`cannot find identity with pubkey ${pubkeyOrCommitment}`);
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
                provider: '',
                name: '',
                identity_path: '',
                identity_commitment: '',
                serialized_identity: '',
            });
        }

        if (identity.type === 'interrep') {
            if (!identity.provider) throw new Error('missing provider');
            if (!identity.name) throw new Error('missing name');
            if (!identity.identityPath) throw new Error('missing identityPath');
            if (!identity.identityCommitment) throw new Error('missing identityCommitment');
            if (!identity.serializedIdentity) throw new Error('missing serializedIdentity');

            store?.put({
                type: identity.type,
                address: identity.address,
                nonce: identity.nonce,
                provider: identity.provider,
                name: identity.name,
                identity_path: identity.identityPath,
                identity_commitment: identity.identityCommitment,
                serialized_identity: encrypt(identity.serializedIdentity, this.passphrase),
                public_key: '',
                private_key: '',
            });
        }

        await pushReduxAction(setIdentities(await this.getIdentities()));
    }

    async writePassphrase(value: string) {
        if (!value) {
            await this.writeKey(PASSPHRASE, '');
            return;
        }

        const salt = await this.readKey<string>(SALT);

        if (!salt) {
            await this.writeKey(SALT, randomSalt());
        }

        await this.writeKey(PASSPHRASE, encrypt(value, salt));

        this.passphrase = value;
        await pushReduxAction(setUnlocked(!!value));
    }

    async readPassphrase(): Promise<string> {
        const salt = await this.readKey<string>(SALT);
        const encrypted = await this.readKey<string>(PASSPHRASE);

        if (salt && encrypted) {
            return decrypt(encrypted, salt);
        }

        return '';
    }

    async writeKey(key: string, value: string) {
        const tx = this.db?.transaction("keyvalue", "readwrite");
        const store = tx?.objectStore("keyvalue");
        store?.put({ id: key, value: value });
    }

    async readKey<returnType>(key: string): Promise<returnType> {
        return new Promise(async (resolve, reject) => {
            const tx = this.db?.transaction("keyvalue", "readwrite");
            const store = tx?.objectStore("keyvalue");
            const index = store?.index("by_id");

            if (!index) return reject();

            const request = index.get(key);

            request.onsuccess = () => {
                const res = request.result;

                if (!res) {
                    resolve();
                    return;
                }

                resolve(res.value);
            }
        });
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
                    provider: id.provider,
                    name: id.name,
                    identityPath: id.identity_path,
                    identityCommitment: id.identity_commitment,
                    serializedIdentity: id.serialized_identity,
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
                            provider: id.provider,
                            name: id.name,
                            identityPath: id.identity_path,
                            identityCommitment: id.identity_commitment,
                            serializedIdentity: id.serialized_identity,
                        }
                    });
                resolve(ids);
            }
        });
    }
}
