import "./chat-content.scss";
import React, {ReactElement, useState, KeyboardEvent, useCallback, useEffect} from "react";
import classNames from "classnames";
import {useParams} from "react-router";
import InfiniteScrollable from "../InfiniteScrollable";
import {useSelectedLocalId} from "../../ducks/worker";
import Nickname from "../Nickname";
import Avatar, {Username} from "../Avatar";
import Textarea from "../Textarea";
import {ChatMessage, createMessageBundle, deriveSharedKey, ZKChatClient} from "../../util/zkchat";
import {generateECDHKeyPairFromhex, generateZkIdentityFromHex, sha256, signWithP256} from "../../util/crypto";
import {encrypt, decrypt} from "../../util/encrypt";
import config from "../../util/config";
import {FromNow} from "../ChatMenu";
import {useUser} from "../../ducks/users";
import {useChatMessage, zkchat} from "../../ducks/chats";

export default function ChatContent(): ReactElement {
    const { receiver, senderECDH } = useParams<{receiver: string; messageId?: string; senderECDH?: string}>();
    const selected = useSelectedLocalId();
    const [content, setContent] = useState('');
    const [sk, setSharedkey] = useState('');
    const [order, setOrder] = useState<string[]>([]);
    const user = useUser(receiver);

    useEffect(() => {
        const cb = (msg?: ChatMessage) => {
            if (!msg) {
                setOrder(zkchat.dms[receiver] || []);
                return;
            }

            if (msg.type === 'DIRECT') {
                if (msg.receiver === receiver && msg.sender.ecdh === senderECDH) {
                    setOrder(zkchat.dms[receiver] || []);
                }
            }
        };

        cb();
        zkchat.on(ZKChatClient.EVENTS.MESSAGE_APPENDED, cb);
        zkchat.on(ZKChatClient.EVENTS.MESSAGE_PREPENDED, cb);

        return () => {
            zkchat.off(ZKChatClient.EVENTS.MESSAGE_APPENDED, cb);
            zkchat.off(ZKChatClient.EVENTS.MESSAGE_PREPENDED, cb);
        }
    }, [receiver, senderECDH]);

    useEffect(() => {
        (async () => {
            if (!selected || !user) return;

            const keyPair = await generateECDHFromExistingId();
            const sharedKey = deriveSharedKey(user.ecdh, keyPair!.priv);
            setSharedkey(sharedKey);

            await zkchat.fetchMessagesByChat({
                type: 'DIRECT',
                receiver: receiver,
                senderECDH: user.ecdh,
            });
        })();
    }, [receiver, selected, user]);

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
        if (selected?.type !== 'gun' || !user) return;

        const signature = signWithP256(selected.privateKey, selected.address) + '.' + selected.address;
        const json = await zkchat.sendDirectMessage(
            {
                type: 'DIRECT',
                receiver,
                senderECDH: user.ecdh,
            },
            content,
            {
                'X-SIGNED-ADDRESS': signature,
            },
        );
        setContent('');
    }, [content, receiver, generateECDHFromExistingId, selected, user]);

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
                {order.map(messageId => {
                   return (
                       <ChatMessageBubble key={messageId} messageId={messageId} />
                   );
                })}
            </InfiniteScrollable>
            <div className="chat-content__editor-wrapper">
                <div className="chat-content__editor ml-2">
                    <Textarea
                        className="text-light border mr-2 my-2"
                        rows={Math.max(0, content.split('\n').length)}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        onKeyPress={onEnter}
                    />
                </div>
                <Avatar
                    className="w-10 h-10 m-2"
                    address={selected?.address}
                />
            </div>
        </div>
    );
}

function ChatMessageBubble(props: { messageId: string }) {
    const selected = useSelectedLocalId();
    const chatMessage = useChatMessage(props.messageId);

    if (chatMessage.type !== 'DIRECT') return <></>;

    return (
        <div
            key={chatMessage.messageId}
            className={classNames("chat-message", {
                'chat-message--self': chatMessage.sender === selected?.address,
            })}
        >
            <div className={classNames("chat-message__content text-light", {
                'italic opacity-70': chatMessage.encryptionError,
            })}>
                {chatMessage.encryptionError ? 'Cannot decrypt message' : chatMessage.content}
            </div>
            <FromNow
                className="chat-message__time text-xs mt-2 text-gray-700"
                timestamp={chatMessage.timestamp}
            />
        </div>
    );
}

