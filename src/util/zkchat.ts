import EC from "elliptic";
import {RLNFullProof} from "@zk-kit/protocols";
import crypto from "crypto";
import config from "./config";

export enum ChatMessageType {
    DIRECT = 'DIRECT',
    PUBLIC_ROOM = 'PUBLIC_ROOM',
    PRIVATE_ROOM = 'PRIVATE_ROOM',
}

export type DirectChatMessage = {
    messageId: string;
    timestamp: Date;
    type: ChatMessageType.DIRECT;
    sender: string;
    pubkey?: string;
    rln?: RLNFullProof & {
        epoch: number;
        x_share: string;
    };
    receiver: string;
    ciphertext: string;
    content?: string;
    reference?: string;
    attachment?: string;
}

export type PublicRoomChatMessage = {
    messageId: string;
    timestamp: Date;
    type: ChatMessageType.PUBLIC_ROOM;
    sender: string;
    rln?: RLNFullProof & {
        epoch: number;
        x_share: string;
    };
    receiver: string;
    content: string;
    reference: string;
    attachment: string;
}

export type ChatMessage = DirectChatMessage | PublicRoomChatMessage;

// 0ac5d2002069ff804a845eb773fe838ac3f6c9c321455f001d65a0a287c8b5e9 71a326a7d366acc05df4ff03363da3dc8183376a53705a7c8bbe34040c4020b
// 0ab0702a5076ed402496ace184aa16b4ad3a08cdd687dc04b69005d236dd063d c560ddd924f24ad3cd34255ad3d55795040425707bed78e1c32f47866d6aec4
export const deriveSharedKey = (receiverPubkey: string, senderPrivateKey: string): string => {
    const ec = new EC.ec('curve25519');
    const sendKey = ec.keyFromPrivate(senderPrivateKey);
    const receiverKey = ec.keyFromPublic(receiverPubkey, 'hex');
    const shared = sendKey.derive(receiverKey.getPublic());
    return shared.toString(16);
}

type createMessageBundleOptions = {
    type: 'DIRECT',
    sender: string;
    timestamp?: Date;
    pubkey?: string;
    receiver: string;
    ciphertext?: string;
    rln?: RLNFullProof & {
        epoch: number;
        x_share: string;
    };
} | {
    type: 'PUBLIC_ROOM',
    sender: string;
    timestamp?: Date;
    pubkey?: string;
    receiver: string;
    content?: string;
    reference?: string;
    attachment?: string;
    rln?: RLNFullProof & {
        epoch: number;
        x_share: string;
    };
}

export const createMessageBundle = async (options: createMessageBundleOptions) => {
    if (options.type === 'DIRECT') {
        const chat: ChatMessage = {
            messageId: '',
            type: ChatMessageType.DIRECT,
            timestamp: options.timestamp || new Date(),
            sender: options.sender,
            pubkey: options.pubkey,
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
    }

    data += chatMessage.receiver;

    if (chatMessage.type === 'DIRECT') {
        data += chatMessage.pubkey || '';
        data += chatMessage.ciphertext;
    }

    if (chatMessage.type === 'PUBLIC_ROOM') {
        data += chatMessage.content;
        data += chatMessage.reference;
        data += chatMessage.attachment;
    }

    return crypto.createHash('sha256').update(data).digest('hex');
}