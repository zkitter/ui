import EC from "elliptic";
import {genExternalNullifier, RLNFullProof, RLN, MerkleProof} from "@zk-kit/protocols";
import crypto from "crypto";
import {ZkIdentity} from "@zk-kit/identity";
import config from "./config";
import EventEmitter2, {ConstructorOptions} from "eventemitter2";
import {decrypt, encrypt} from "./encrypt";
import {base64ToArrayBuffer, generateECDHKeyPairFromhex, sha256} from "./crypto";
import {findProof} from "./merkle";
import {safeJsonParse} from "./misc";

export enum ChatMessageType {
    DIRECT = 'DIRECT',
    PUBLIC_ROOM = 'PUBLIC_ROOM',
    PRIVATE_ROOM = 'PRIVATE_ROOM',
}

export type DirectChatMessage = {
    messageId: string;
    timestamp: Date;
    type: ChatMessageType.DIRECT;
    sender: {
        address?: string;
        ecdh?: string;
        hash?: string;
    };
    rln?: RLNFullProof & {
        epoch: string;
        x_share: string;
        group_id?: string;
    };
    receiver: {
        address?: string;
        ecdh?: string;
        roomId?: string;
    };
    ciphertext: string;
    content?: string;
    reference?: string;
    attachment?: string;
    encryptionError?: boolean;
}

export type PublicRoomChatMessage = {
    messageId: string;
    timestamp: Date;
    type: ChatMessageType.PUBLIC_ROOM;
    sender: {
        address?: string;
        ecdh?: string;
        hash?: string;
    };
    rln?: RLNFullProof & {
        epoch: string;
        x_share: string;
        group_id: string;
    };
    receiver: {
        address?: string;
        ecdh?: string;
        roomId?: string;
    };
    content: string;
    reference: string;
    attachment: string;
    encryptionError?: boolean;
}

export type ChatMessage = DirectChatMessage | PublicRoomChatMessage;

export type Chat = {
    type: 'DIRECT';
    receiver: string;
    receiverECDH: string;
    senderECDH: string;
    senderHash?: string;
} | {
    type: 'PUBLIC_ROOM';
    receiver: string;
    senderECDH: string;
    senderHash?: string;
}

export const deriveSharedKey = (receiverPubkey: string, senderPrivateKey: string): string => {
    const ec = new EC.ec('curve25519');
    const sendKey = ec.keyFromPrivate(senderPrivateKey);
    const receiverKey = ec.keyFromPublic(receiverPubkey, 'hex');
    const shared = sendKey.derive(receiverKey.getPublic());
    return shared.toString(16);
}

const signWithP256 = (privHex: string, data: string) => {
    const ec = new EC.ec('p256');
    const key = ec.keyFromPrivate(privHex);
    const msgHash = Buffer.from(data, 'utf-8').toString('hex');
    const signature = key.sign(msgHash);
    return Buffer.from(signature.toDER()).toString('hex');
}

type createMessageBundleOptions = {
    type: 'DIRECT',
    sender: {
        address?: string;
        ecdh?: string;
        hash?: string;
    };
    timestamp?: Date;
    pubkey?: string;
    receiver: {
        address?: string;
        ecdh?: string;
        roomId?: string;
    };
    ciphertext?: string;
    rln?: RLNFullProof & {
        epoch: string;
        x_share: string;
        group_id: string;
    };
} | {
    type: 'PUBLIC_ROOM',
    sender: {
        address?: string;
        ecdh?: string;
        hash?: string;
    };
    timestamp?: Date;
    pubkey?: string;
    receiver: {
        address?: string;
        ecdh?: string;
        roomId?: string;
    };
    content?: string;
    reference?: string;
    attachment?: string;
    rln?: RLNFullProof & {
        epoch: string;
        x_share: string;
        group_id: string;
    };
}

export const createMessageBundle = async (options: createMessageBundleOptions) => {
    if (options.type === 'DIRECT') {
        const chat: ChatMessage = {
            messageId: '',
            type: ChatMessageType.DIRECT,
            timestamp: options.timestamp || new Date(),
            sender: options.sender,
            receiver: options.receiver,
            rln: options.rln,
            ciphertext: options.ciphertext || '',
        };
        const messageId = await deriveMessageId(chat);
        return {
            ...chat,
            messageId,
            timestamp: chat.timestamp.getTime(),
        };
    }

    return null;
}

export const deriveMessageId = async (chatMessage: ChatMessage): Promise<string> => {
    let data = '';
    data += chatMessage.type;
    data += chatMessage.timestamp.getTime();
    data += chatMessage.sender;

    if (chatMessage.rln) {
        data += JSON.stringify(chatMessage.rln)
    } else if (chatMessage.sender.address) {
        data += chatMessage.sender.address || '';
    } else if (chatMessage.sender.ecdh) {
        data += chatMessage.sender.ecdh || '';
        data += chatMessage.sender.hash || '';
    }

    data += chatMessage.receiver;

    if (chatMessage.type === 'DIRECT') {
        data += chatMessage.ciphertext;
    }

    if (chatMessage.type === 'PUBLIC_ROOM') {
        data += chatMessage.content;
        data += chatMessage.reference;
        data += chatMessage.attachment;
    }

    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Returns rounded timestamp to the nearest 10-second in milliseconds.
 */
export const getEpoch = (): string => {
    const timeNow = new Date();
    timeNow.setSeconds(Math.floor(timeNow.getSeconds() / 5) * 5);
    timeNow.setMilliseconds(0);
    return timeNow.getTime().toString();
}

type ZKChatIdentity = {
    address: string;
    ecdh: { pub: string, priv: string };
    zk: ZkIdentity;
}

export class ZKChatClient extends EventEmitter2 {
    static EVENTS = {
        MESSAGE_PREPENDED: 'MESSAGE_PREPENDED',
        MESSAGE_APPENDED: 'MESSAGE_APPENDED',
        CHAT_CREATED: 'CHAT_CREATED',
    };

    activeChats: {
        [chatId: string]: Chat & {
            messages: string[];
        };
    };
    messages: {
        [messageId: string]: ChatMessage & {
            decrypted: boolean;
        };
    };
    identity?: ZKChatIdentity
    api: string;
    lsPrefix: string;

    constructor(options: ConstructorOptions & {
        identity?: ZKChatIdentity
        api?: string,
        lsPrefix?: string,
    }) {
        super(options);
        this.activeChats = {};
        this.messages = {};
        this.identity = options.identity;
        this.lsPrefix = options.lsPrefix || 'zkchat_ls_';
        this.api = options.api || 'http://localhost:8081';
    }

    deriveChatId(chat: Chat) {
        if (chat.type === 'DIRECT') {
            const keys = [];
            keys.push(chat.receiverECDH);
            keys.push(chat.senderECDH);
            keys.sort((a, b) => {
                if (a > b) return 1;
                if (a < b) return -1;
                return 0;
            });
            return keys.join('-');
        }

        if (chat.type === 'PUBLIC_ROOM') {
            return chat.receiver;
        }

        throw new Error('invalid chat');
    }

    private _ensureIdentity() {
        if (!this.identity) throw new Error('no identity');
    }

    private _ensureChat(chat: Chat) {
        const chatId = this.deriveChatId(chat);
        const existing = this.activeChats[chatId];

        if (!existing) {
            this.activeChats[chatId] = {
                ...chat,
                messages: [],
            };
        }
    }

    private _save() {
        this._ensureIdentity();
        const address = this.identity!.address;
        const rawData = JSON.stringify({
            activeChats: this.activeChats,
        });
        localStorage.setItem(this.lsPrefix + address, rawData);
    }

    private _load() {
        this._ensureIdentity();
        const address = this.identity!.address;
        const rawData = localStorage.getItem(this.lsPrefix + address);

        let bucket;

        try {
            bucket = rawData ? JSON.parse(rawData) : {
                activeChats: {},
            };
        } catch (e) {
            console.error(e);
            bucket = {
                activeChats: {},
            };
        }

        this.messages = {};
        this.activeChats = Object.entries(bucket.activeChats)
            .reduce((acc: any, [chatId, chat]: any[]) => {
                acc[chatId] = {
                    ...chat,
                    messages: [],
                };
                return acc;
            }, {});
    }

    importIdentity(identity: ZKChatIdentity) {
        this.identity = identity;
        this._load();
    }

    createDM = async (receiver: string, receiverECDH: string, isAnon?: boolean): Promise<Chat> => {
        this._ensureIdentity();
        const chat: Chat = {
            type: 'DIRECT',
            receiver: receiver,
            receiverECDH: receiverECDH,
            senderECDH: this.identity!.ecdh.pub,
        };

        if (isAnon) {
            const token = crypto.randomBytes(16).toString('hex');
            const senderHash = signWithP256(this.identity!.ecdh.priv, await sha256(receiver + token));
            const seedHash = signWithP256(this.identity!.ecdh.priv, senderHash);
            const keypair = await generateECDHKeyPairFromhex(seedHash);
            chat.senderHash = senderHash;
            chat.senderECDH = keypair.pub;
        }

        this.appendActiveChats(chat);

        return chat;
    }

    appendActiveChats = (chat: Chat) => {
        const chatId = this.deriveChatId(chat);

        const exist = this.activeChats[chatId];

        if (!exist) {
            this.activeChats[chatId] = {
                ...chat,
                messages: [],
            };
            this.emit(ZKChatClient.EVENTS.CHAT_CREATED, chat);
            this._save();
        }
    }

    insertMessage = (message: ChatMessage) => {
        this.messages[message.messageId] = {
            ...message,
            decrypted: message.type === 'DIRECT' && !!message.ciphertext && !message.content,
        };
    }

    fetchMessagesByChat = async (chat: Chat): Promise<ChatMessage[]> => {
        this._ensureIdentity();
        this._ensureChat(chat);

        const chatId = this.deriveChatId(chat);
        const existingMsgs = this.activeChats[chatId].messages || [];
        const messages: ChatMessage[] = [];

        if (chat.type === 'DIRECT') {
            const last = this.messages[existingMsgs[existingMsgs.length - 1]];
            const offset = last ? last.timestamp.getTime() : Date.now();
            const url = `${this.api}/chat-messages/dm/${chat.receiverECDH}/${chat.senderECDH}`;
            const resp = await fetch(`${url}?offset=${offset}`);
            const json = await resp.json();

            let priv, sk = '';

            if (chat.senderHash) {
                const seedHash = signWithP256(this.identity!.ecdh.priv, chat.senderHash);
                const keypair = await generateECDHKeyPairFromhex(seedHash);
                priv = keypair.priv;
            } else {
                priv = this.identity!.ecdh.priv;
            }

            if (chat.type === 'DIRECT') {
                sk = deriveSharedKey(
                    chat.receiverECDH,
                    priv,
                );
            }

            for (const data of json.payload) {
                let content = '';
                let error = false;

                try {
                    if (data.ciphertext) {
                        content = decrypt(data.ciphertext, sk);
                        error = !content;
                    }
                } catch (e) {
                    error = true;
                }

                const message: ChatMessage = {
                    messageId: data.message_id,
                    ciphertext: data.ciphertext,
                    content: content,
                    timestamp: new Date(Number(data.timestamp)),
                    receiver: {
                        address: data.receiver_address,
                        ecdh: data.receiver_pubkey,
                    },
                    sender: {
                        address: data.sender_address,
                        hash: data.sender_hash,
                        ecdh: data.sender_pubkey,
                    },
                    rln: data.rln_serialized_proof && safeJsonParse(data.rln_serialized_proof),
                    type: data.type,
                    encryptionError: error,
                };

                if (!this.messages[data.message_id]) {
                    this.insertMessage(message);
                    const order = this.activeChats[chatId].messages;
                    this.activeChats[chatId].messages = [...new Set([...order, data.message_id])];
                    messages.push(message);
                    this.emit(ZKChatClient.EVENTS.MESSAGE_PREPENDED, message);
                }

            }
        }

        return messages;
    }

    getMessage = (messageId: string): ChatMessage => {
        return this.messages[messageId];
    }

    fetchActiveChats = async (address: string): Promise<Chat[]> => {
        this._ensureIdentity();
        const resp = await fetch(`${this.api}/chats/dm/${address}`);
        const json = await resp.json();

        if (!json.error) {
            for (const chat of json.payload) {
                this.appendActiveChats({
                    ...chat,
                    senderECDH: this.identity!.ecdh.pub,
                });
            }
            return json.payload;
        } else {
            throw new Error(json.payload);
        }
    }

    generateRLNProof = async (signal: string, merkleProof: MerkleProof) => {
        const epoch = getEpoch();
        const externalNullifier = genExternalNullifier(epoch);
        const identitySecretHash = this.identity!.zk.getSecretHash();
        const rlnIdentifier = await sha256('zkchat');
        const xShare = RLN.genSignalHash(signal);
        const witness = RLN.genWitness(
            identitySecretHash,
            merkleProof!,
            externalNullifier,
            signal,
            BigInt('0x' + rlnIdentifier),
        );
        const proof = await RLN.genProof(
            witness,
            `${config.indexerAPI}/circuits/rln/wasm`,
            `${config.indexerAPI}/circuits/rln/zkey`,
        );

        return {
            ...proof,
            x_share: xShare.toString(),
            epoch,
            group_id: 'zksocial_all',
        }
    }

    sendDirectMessage = async (
        chat: Chat,
        content: string,
        headerOptions?: {[key: string]: string},
        merkleProof?: MerkleProof | null,
        identitySecretHash?: bigint,
    ) => {
        this._ensureIdentity();
        this._ensureChat(chat);

        const chatId = this.deriveChatId(chat);

        if (chat.type !== 'DIRECT') return;

        const ecdh = chat.receiverECDH;

        let senderECDH;
        let priv = this.identity!.ecdh.priv;

        if (chat.senderHash) {
            const seedHash = signWithP256(this.identity!.ecdh.priv, chat.senderHash);
            const keypair = await generateECDHKeyPairFromhex(seedHash);
            priv = keypair.priv;
            senderECDH = keypair.pub;
        }

        const sharedKey = deriveSharedKey(ecdh, priv);

        const ciphertext = await encrypt(content, sharedKey);
        const bundle = await createMessageBundle({
            type: 'DIRECT',
            receiver: {
                address: chat.receiver,
                ecdh: chat.receiverECDH,
            },
            ciphertext,
            sender: {
                address: chat.senderHash ? undefined : this.identity!.address,
                ecdh: senderECDH,
                hash: chat.senderHash,
            },
        });

        if (chat.senderHash) {
            const epoch = getEpoch();
            const externalNullifier = genExternalNullifier(epoch);
            const signal = bundle!.messageId;
            const rlnIdentifier = await sha256('zkchat');
            const xShare = RLN.genSignalHash(signal);
            const witness = RLN.genWitness(
                identitySecretHash!,
                merkleProof!,
                externalNullifier,
                signal,
                BigInt('0x' + rlnIdentifier),
            );
            const proof = await RLN.genProof(
                witness,
                `${config.indexerAPI}/circuits/rln/wasm`,
                `${config.indexerAPI}/circuits/rln/zkey`,
            );
            bundle!.rln = {
                ...proof,
                x_share: xShare.toString(),
                epoch,
            }

        }

        const res = await fetch(`${config.indexerAPI}/v1/zkchat/chat-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headerOptions,
            },
            body: JSON.stringify(bundle),
        });
        const json = await res.json();

        if (json.error) {
            throw new Error(json.payload);
        }

        const message: ChatMessage = {
            type: ChatMessageType.DIRECT,
            messageId: json.payload.message_id,
            timestamp: new Date(Number(json.payload.timestamp)),
            content,
            ciphertext: json.payload.ciphertext,
            receiver: {
                address: json.payload.receiver_address,
                ecdh: json.payload.receiver_pubkey,
            },
            sender: {
                address: json.payload.sender_address,
                ecdh: json.payload.sender_pubkey,
                hash: json.payload.sender_hash,
            },
        };

        const order = this.activeChats[chatId].messages || [];
        this.activeChats[chatId].messages = [json.payload.message_id, ...order];
        this.insertMessage(message);
        this.emit(ZKChatClient.EVENTS.MESSAGE_PREPENDED, message);

        return json;
    }

}
