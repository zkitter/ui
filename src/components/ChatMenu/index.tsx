import "./chat-menu.scss";
import React, {ChangeEvent, MouseEvent, ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import Avatar, {Username} from "../Avatar";
import {useSelectedLocalId} from "../../ducks/worker";
import moment from "moment";
import config from "../../util/config";
import Nickname from "../Nickname";
import {useHistory, useParams} from "react-router";
import {useDispatch} from "react-redux";
import chats, {fetchChats, useChatId, useChatIds, zkchat} from "../../ducks/chats";
import Icon from "../Icon";
import Input from "../Input";
import {Chat} from "../../util/zkchat";
import Modal, {ModalContent, ModalFooter, ModalHeader} from "../Modal";
import Button from "../Button";
import {getName} from "../../util/user";
import {useUser} from "../../ducks/users";

export default function ChatMenu(): ReactElement {
    const selected = useSelectedLocalId();
    const selecteduser = useUser(selected?.address);
    const history = useHistory();
    const dispatch = useDispatch();
    const chatIds = useChatIds();
    const [showingCreateChat, setShowingCreateChat] = useState(false);
    const [selectedNewConvo, selectNewConvo] = useState<Chat | null>(null);
    const [searchParam, setSearchParam] = useState('');
    const [searchResults, setSearchResults] = useState<Chat[] | null>(null);

    useEffect(() => {
        if (selecteduser?.ecdh && selected?.type === 'gun') {
            setTimeout(() => {
                dispatch(fetchChats(selecteduser.ecdh));
            }, 500);
        }
    }, [selected, selecteduser]);

    const onSearchNewChatChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        if (selected?.type !== 'gun') return;

        setSearchParam(e.target.value);
        const res = await fetch(`${config.indexerAPI}/v1/zkchat/chats/search/${e.target.value}`);
        const json = await res.json();

        setSearchResults(json.payload.map((data: any) => ({
            type: 'DIRECT',
            receiver: data.receiver_address,
            ecdh: data.receiver_ecdh,
        })))
    }, [selected]);

    const openChat = useCallback((chat: Chat) => {
        history.push(`/chat/${zkchat.deriveChatId(chat)}`);
    }, []);

    if (!selected) return <></>;

    return (
        <div className="chat-menu">
            <div className="chat-menu__header">
                <div className="flex flex-row chat-menu__header__r">
                    {
                        showingCreateChat && (
                            <Icon
                                className="chat-menu__create-icon text-gray-400 hover:text-gray-800 py-2 pl-2"
                                fa="fas fa-arrow-left"
                                size={.75}
                                onClick={() => {
                                    setShowingCreateChat(false);
                                    setSearchParam('');
                                    setSearchResults(null);
                                }}
                            />
                        )
                    }
                    <div
                        className="text-xs font-bold flex-grow ml-2"
                    >
                        {showingCreateChat ? 'Create New Conversation' : 'Conversations' }
                    </div>
                    {
                        !showingCreateChat && (
                            <Icon
                                className="chat-menu__create-icon text-gray-400 hover:text-gray-800 py-2 px-2"
                                fa="fas fa-plus"
                                size={.75}
                                onClick={() => {
                                    setShowingCreateChat(true);
                                    // @ts-ignore
                                    onSearchNewChatChange({ target: { value: '' }});
                                }}
                            />
                        )
                    }
                </div>
                <Input
                    className="border text-sm chat-menu__search"
                    onChange={showingCreateChat ? onSearchNewChatChange : undefined}
                    value={searchParam}
                    placeholder={!showingCreateChat ? 'Search' : 'Search by name'}
                >
                    <Icon className="text-gray-400 mx-2" fa="fas fa-search" size={.75} />
                </Input>
            </div>
            { !!showingCreateChat && (
                searchResults?.length
                    ? searchResults.map((chat) => (
                        <ChatMenuItem
                            key={chat.type + chat.receiver}
                            chatId=""
                            chat={chat}
                            openChat={() => selectNewConvo(chat)}
                            hideLastChat
                        />
                    ))
                    : (
                        <div className="text-center text-light text-gray-400 font-semibold my-2">
                            No conversations found
                        </div>
                    )
            )}
            { !showingCreateChat && chatIds.map((chatId) => (
                <ChatMenuItem
                    key={chatId}
                    chatId={chatId}
                    openChat={openChat}
                />
            ))}
            {
                selectedNewConvo && (
                    <CreateChatOptionModal
                        onClose={() => {
                            selectNewConvo(null);
                            setShowingCreateChat(false);
                        }}
                        chat={selectedNewConvo}
                    />
                )
            }
        </div>
    );
};

function CreateChatOptionModal(props: {
    chat: Chat;
    onClose: () => void;
}): ReactElement {
    const selected = useSelectedLocalId();
    const user = useUser(selected?.address);
    const r_user = useUser(props.chat.receiver);
    const history = useHistory();

    const startChat = useCallback(async (e: MouseEvent<HTMLButtonElement>, isAnon: boolean) => {
        e.stopPropagation();
        if (!r_user) return;
        const chat = await zkchat.createDM(r_user.address, r_user.ecdh, isAnon);
        props.onClose();
        const chatId = zkchat.deriveChatId(chat);
        history.push(`/chat/${chatId}`);
    }, [props.chat, r_user]);

    if (!user) return <></>;

    return (
        <Modal
            className="w-96"
            onClose={props.onClose}
        >
            <ModalHeader>
                { props.chat.type === 'DIRECT' ? 'Create Direct Message' : 'Create New Group'}
            </ModalHeader>
            <ModalContent>
                <div>

                </div>
            </ModalContent>
            <ModalFooter className="create-chat-options__footer">
                <Button
                    className="mr-1 create-chat-options__create-btn"
                    onClick={(e) => startChat(e, false)}
                >
                    <Avatar className="w-10 h-10" address={user.address} />
                    <div className="ml-2">{`Chat as ${getName(user)}`}</div>
                </Button>
                <Button
                    className="mr-1 create-chat-options__create-btn create-chat-options__create-btn--anon"
                    onClick={(e) => startChat(e, true)}
                >
                    <Avatar className="w-10 h-10 bg-black" incognito />
                    <div className="ml-2">Chat anonymously</div>
                </Button>
            </ModalFooter>
        </Modal>
    );
}

const ONE_MIN = 60 * 1000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;

function ChatMenuItem(props: {
    chatId: string;
    chat?: Chat;
    openChat: (chat: Chat) => void;
    hideLastChat?: boolean;
}): ReactElement {
    let chat = useChatId(props.chatId);
    const {chatId} = useParams<{chatId: string}>();

    const isSelected = props.chatId === chatId;

    if (props.chat) {
        // @ts-ignore
        chat = props.chat;
    }

    if (!chat) return <></>;

    return (
        <div
            className={classNames("flex flex-row chat-menu__item", {
                'chat-menu__item--selected': isSelected,
                'chat-menu__item--anon': chat.type === 'DIRECT' && chat.senderHash,
            })}
            onClick={() => props.openChat(chat)}
        >
            <div className="relative">
                <Avatar
                    className="w-12 h-12 flex-grow-0 flex-shrink-0"
                    address={chat.receiver || ''}
                    incognito={!chat.receiver}
                />
                {
                    chat.type === 'DIRECT' && chat.senderHash && (
                        <Avatar
                            className="chat-menu__item__anon-marker"
                            incognito
                        />
                    )
                }
            </div>
            <div className="flex flex-col flex-grow flex-shrink mx-4 w-0">
                <Nickname
                    className="font-bold truncate"
                    address={chat.receiver || ''}
                />
                {
                    !props.hideLastChat && (
                        <div
                            className={classNames("text-sm truncate text-gray-800", {
                                // 'text-gray-200': chat.type === 'DIRECT' && chat.senderHash,
                                'text-gray-800': chat.type !== 'DIRECT' || !chat.senderHash,
                            })}
                        >
                            sudsfasdfasdfasdfasdfasdfasdfasdfasdfasfasfp?
                        </div>
                    )
                }
            </div>
            {
                !props.hideLastChat && (
                    <div
                        className={classNames("flex-grow-0 flex-shrink-0 mt-1 text-gray-500", {
                            // 'text-gray-400': chat.type === 'DIRECT' && chat.senderHash,
                            'text-gray-500': chat.type !== 'DIRECT' || !chat.senderHash,
                        })}
                    >
                        <FromNow className="text-xs" timestamp={new Date(Date.now() - ONE_HOUR * Math.random())} />
                    </div>
                )
            }
        </div>
    )
}


export function FromNow(props: {
    timestamp: Date;
    className?: string;
}): ReactElement {
    const now = new Date();
    const past = props.timestamp.getTime();
    const diff = now.getTime() - past;

    let fromNow = '';

    if (diff < ONE_MIN) {
        fromNow = 'Now';
    } else if (diff < ONE_HOUR) {
        fromNow = Math.floor(diff/ONE_MIN) + 'm';
    } else if (diff < ONE_DAY) {
        fromNow = Math.floor(diff/ONE_HOUR) + 'h';
    } else if (diff < ONE_WEEK) {
        fromNow = Math.floor(diff/ONE_DAY) + 'd';
    } else if (props.timestamp.getFullYear() === now.getFullYear()) {
        fromNow = moment(props.timestamp).format('ll').split(',')[0];
    } else {
        fromNow = moment(props.timestamp).format('ll');
    }

    return <div className={props.className}>{fromNow}</div>;
}