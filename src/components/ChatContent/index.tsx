import "./chat-content.scss";
import React, {ReactElement, useState, KeyboardEvent, useCallback, useEffect} from "react";
import classNames from "classnames";
import {useParams} from "react-router";
import InfiniteScrollable from "../InfiniteScrollable";
import {useSelectedLocalId} from "../../ducks/worker";
import Nickname from "../Nickname";
import Avatar, {Username} from "../Avatar";
import Textarea from "../Textarea";
import {Chat, ChatMessage, ZKChatClient} from "../../util/zkchat";
import {generateECDHKeyPairFromhex, generateZkIdentityFromHex, sha256, signWithP256} from "../../util/crypto";
import {FromNow} from "../ChatMenu";
import {useUser} from "../../ducks/users";
import {useChatId, useChatMessage, zkchat} from "../../ducks/chats";

export default function ChatContent(): ReactElement {
    const { chatId } = useParams<{chatId: string}>();
    const selected = useSelectedLocalId();
    const [content, setContent] = useState('');
    const [order, setOrder] = useState<string[]>([]);
    const selectedUser = useUser(selected?.address);
    const chat = useChatId(chatId);

    useEffect(() => {
        const cb = (msg?: ChatMessage) => {
            if (!chat) return;

            if (!msg) {
                setOrder(zkchat.activeChats[chatId]?.messages || []);
                return;
            }

            if (msg.type === 'DIRECT' && chat.type === 'DIRECT') {
                if (
                    [chat.receiverECDH, chat.senderECDH].includes(msg.receiver.ecdh as string)
                    || [chat.receiverECDH, chat.senderECDH].includes(msg.sender.ecdh as string)
                ) {
                    setOrder(zkchat.activeChats[chatId]?.messages || []);
                    return;
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
    }, [chat, chatId]);

    useEffect(() => {
        (async () => {
            if (!chat) return;
            await zkchat.fetchMessagesByChat(chat);
        })();
    }, [chat]);

    const submitMessage = useCallback(async () => {
        if (selected?.type !== 'gun' || !chat) return;

        const signature = signWithP256(selected.privateKey, selected.address) + '.' + selected.address;
        const json = await zkchat.sendDirectMessage(
            chat,
            content,
            {
                'X-SIGNED-ADDRESS': signature,
            },
        );
        setContent('');
    }, [content, selected, chat]);

    const onEnter = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitMessage();
        }
    }, [submitMessage]);

    if (!chat) return <></>;

    return (
        <div
            className={classNames('chat-content', {
                'chat-content--anon': chat?.senderHash,
            })}>
            <div className="chat-content__header">
                <Avatar
                    className="w-10 h-10"
                    address={chat?.receiver}
                    incognito={!chat?.receiver}
                />
                <div className="flex flex-col flex-grow flex-shrink ml-2">
                    <Nickname
                        className="font-bold"
                        address={chat?.receiver}
                    />
                    <div
                        className={classNames("text-xs", {
                            'text-gray-500': true,
                            // 'text-gray-400': chat?.senderHash,
                        })}
                    >
                        {chat?.receiver && (
                            <>
                                <span>@</span>
                                <Username address={chat?.receiver || ''} />
                            </>
                        )}

                    </div>
                </div>
            </div>
            <InfiniteScrollable
                className="chat-content__messages"
            >
                {order.map(messageId => {
                   return (
                       <ChatMessageBubble
                           key={messageId}
                           messageId={messageId}
                           chat={chat}
                       />
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
                    incognito={!!chat.senderHash}
                />
            </div>
        </div>
    );
}

function ChatMessageBubble(props: {
    messageId: string;
    chat: Chat;
}) {
    const chatMessage = useChatMessage(props.messageId);

    if (chatMessage?.type !== 'DIRECT') return <></>;

    return (
        <div
            key={chatMessage.messageId}
            className={classNames("chat-message", {
                'chat-message--self': chatMessage.sender.ecdh === props.chat.senderECDH,
                'chat-message--anon': chatMessage.sender.hash,
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

