import "./chat-content.scss";
import React, {ReactElement, useState, KeyboardEvent, useCallback, useEffect} from "react";
import classNames from "classnames";
import {useParams} from "react-router";
import InfiniteScrollable from "../InfiniteScrollable";
import {useSelectedLocalId} from "../../ducks/worker";
import Nickname from "../Nickname";
import Avatar, {Username} from "../Avatar";
import Textarea from "../Textarea";
import {ChatMessage, createMessageBundle, deriveSharedKey} from "../../util/zkchat";
import {generateECDHKeyPairFromhex, generateZkIdentityFromHex, sha256, signWithP256} from "../../util/crypto";
import {encrypt, decrypt} from "../../util/encrypt";
import config from "../../util/config";
import {FromNow} from "../ChatMenu";

const pk = '0ac5d2002069ff804a845eb773fe838ac3f6c9c321455f001d65a0a287c8b5e9';

export default function ChatContent(): ReactElement {
    const { receiver, messageId } = useParams<{receiver: string; messageId?: string}>();
    const selected = useSelectedLocalId();
    const [content, setContent] = useState('');
    const [sk, setSharedkey] = useState('');
    const [chats, setChats] = useState<ChatMessage[]>([]);

    useEffect(() => {
        (async () => {
            if (!selected) return;

            const keyPair = await generateECDHFromExistingId();
            const sharedKey = deriveSharedKey(pk, keyPair!.priv);
            console.log(sharedKey);
            setSharedkey(sharedKey);

            const resp = await fetch(`${config.indexerAPI}/v1/zkchat/chat-messages/dm/${selected.address}/${receiver}`);
            const json = await resp.json();
            setChats(json.payload.map((data: any) => {
                const chat: ChatMessage = {
                    messageId: data.message_id,
                    ciphertext: data.ciphertext,
                    timestamp: new Date(Number(data.timestamp)),
                    receiver: data.receiver_address,
                    sender: data.sender_address,
                    type: data.type,
                };
                return chat;
            }))
        })();
    }, [receiver, messageId, selected]);

    const generateECDHFromExistingId = useCallback(async () => {
        if (selected?.type === 'gun') {
            const ecdhseed = await signWithP256(selected.privateKey, 'signing for ecdh - 0');
            const zkseed = await signWithP256(selected.privateKey, 'signing for zk identity - 0');
            const ecdhHex = await sha256(ecdhseed);
            const zkHex = await sha256(zkseed);

            try {
                const keyPair = await generateECDHKeyPairFromhex(ecdhHex);
                const zkIdentity = await generateZkIdentityFromHex(zkHex);
                return keyPair;
                // setIdCommitment(zkIdentity.genIdentityCommitment().toString(16));
            } catch (e) {
                console.error(e);
            }
        }
    }, [selected]);

    const submitMessage = useCallback(async () => {
        if (selected?.type !== 'gun') return;
        const keyPair = await generateECDHFromExistingId();
        const sharedKey = deriveSharedKey(pk, keyPair!.priv);
        const ciphertext = await encrypt(content, sharedKey);
        const bundle = await createMessageBundle({
            type: 'DIRECT',
            receiver,
            ciphertext,
            sender: selected?.address || '',
        });

        const signature = signWithP256(selected.privateKey, selected.address) + '.' + selected.address;
        const res = await fetch(`${config.indexerAPI}/v1/zkchat/chat-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-SIGNED-ADDRESS': signature,
            },
            body: JSON.stringify(bundle),
        });
        const json = await res.json();

        console.log(json);
    }, [content, receiver, generateECDHFromExistingId, selected]);

    const onEnter = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitMessage();
        }
    }, [submitMessage]);

    if (!receiver) return <></>;

    return (
        <div className={classNames('chat-content')}>
            <div className="chat-content__header">
                <Avatar className="w-10 h-10" address={receiver} />
                <div className="flex flex-col flex-grow flex-shrink ml-2">
                    <Nickname className="font-bold" address={receiver} />
                    <div className="text-xs text-gray-500">
                        @<Username address={receiver} />
                    </div>
                </div>
            </div>
            <InfiniteScrollable
                className="chat-content__messages"
            >
                {chats.map(chatMessage => {
                    if (chatMessage.type !== 'DIRECT') return;

                    let content = '';

                    try {
                        content = decrypt(chatMessage.ciphertext, sk);
                    } catch (e) {
                        console.error(e);
                    }

                    return (
                        <div
                            key={chatMessage.messageId}
                            className={classNames("chat-message", {
                                'chat-message--self': chatMessage.sender === selected?.address,
                            })}
                        >
                            <div className="chat-message__content text-light">
                                {content}
                            </div>
                            <FromNow
                                className="chat-message__time text-xs mt-2 text-gray-700"
                                timestamp={chatMessage.timestamp}
                            />
                        </div>
                    );
                })}
            </InfiniteScrollable>
            <div className="chat-content__editor-wrapper">
                <div className="chat-content__editor">
                    <Textarea
                        className="text-light border mr-2 my-2"
                        rows={Math.max(0, content.split('\n').length)}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        onKeyPress={onEnter}
                    />
                </div>
                <Avatar
                    className="w-8 h-8 m-2"
                    address={selected?.address}
                />
            </div>
        </div>
    );
}

