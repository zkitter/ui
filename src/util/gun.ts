import Gun from "gun";
import "gun/sea";
import {Message, MessageType, Post, PostJSON, PostMessageOption, PostMessageSubType} from "./message";
import config from "./config";

const gun = Gun(config.gunPeers);

export const authenticateGun = (keyPair: { pub: string; priv: string }) => {
    // @ts-ignore
    return gun.user().auth(keyPair);
}

export const fetchMessage = async (soul: string): Promise<PostMessageOption> => {
    return new Promise(async (resolve, reject) => {
        // @ts-ignore
        const data = await gun.get(soul);

        let payload;

        const type = Message.getType(data.type);

        if(data.payload) {
            // @ts-ignore
            payload = await gun.get(data.payload['#']);
        }

        if (type === MessageType.Post) {
            if (type === MessageType.Post) {
                const subtype = Post.getSubtype(data.subtype);

                resolve({
                    type: type as MessageType,
                    subtype: subtype as PostMessageSubType,
                    createdAt: new Date(data.createdAt),
                    payload: {
                        topic: payload.topic,
                        title: payload.title,
                        content: payload.content,
                        reference: payload.reference,
                    },
                });
            }
        }
    });
}

export default gun;
