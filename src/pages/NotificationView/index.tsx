import React, {ReactElement, useEffect, useState} from "react";
import classNames from "classnames";
import {useSelectedLocalId} from "../../ducks/worker";
import config from "../../util/config";
import {useHistory} from "react-router";
import {parseMessageId} from "../../util/message";
import {zkchat} from "../../ducks/chats";
import {fetchAddressByName, getUser, useUser} from "../../ducks/users";
import {useThemeContext} from "../../components/ThemeContext";
import {useDispatch} from "react-redux";
import "./notification.scss";
import Avatar from "../../components/Avatar";
import {getUsername, getName} from "../../util/user";

export default function NotificationView(): ReactElement {
    const selected = useSelectedLocalId();
    const selectedUser = useUser(selected?.address);
    const dispatch = useDispatch();
    const history = useHistory();
    const [notifications, setNotifications] = useState([]);
    const theme = useThemeContext();

    useEffect(() => {
        (async function() {
            if (selected?.type === 'gun') {
                const resp = await fetch(`${config.indexerAPI}/v1/${selected.address}/notifications`);
                const json = await resp.json();
                setNotifications(json.payload);
            }
        })();
    }, [selected]);

    useEffect(() => {
        if (selected?.address && !selectedUser?.ecdh) {
            dispatch(getUser(selected.address));
        }
    }, [selectedUser?.ecdh, selected?.address]);

    if (!selectedUser?.ecdh) return <></>;

    return (
        <div
            className={classNames(
                'notifications',
                'border-l border-r',
                {
                    'border-gray-200': theme !== 'dark',
                    'border-gray-800': theme === 'dark',
                }
            )}
        >
            {
                notifications.map((data: any) => {
                    const {
                        message_id,
                        timestamp,
                        type,
                        sender_pubkey,
                    } = data;
                    const { creator, hash } = parseMessageId(message_id);

                    switch (type) {
                        case 'DIRECT':
                            return (
                                <IncomingChatRow
                                    sender_pubkey={sender_pubkey}
                                    creator={data.creator}
                                />
                            )
                        case 'LIKE':
                            return (
                                <IncomingReactionRow
                                    messageId={message_id}
                                />
                            );
                        case 'REPLY':
                            return (
                                <IncomingReplyRow
                                    messageId={message_id}
                                />
                            );
                        default:
                            return <div>{type}</div>;
                    }
                })
            }
        </div>
    );
}

function IncomingChatRow(props: {
    sender_pubkey: string;
    creator: string;
}): ReactElement {
    const selected = useSelectedLocalId();
    const selectedUser = useUser(selected?.address);
    const creator = useUser(props.creator);
    const theme = useThemeContext();
    const history = useHistory();

    const chatId = selectedUser && zkchat.deriveChatId({
        type: 'DIRECT',
        receiver: selectedUser.address,
        receiverECDH: selectedUser.ecdh,
        senderECDH: props.sender_pubkey,
    });

    return (
        <div
            className="flex flex-row cursor-pointer notification-row"
            onClick={() => history.push(`/chat/${chatId}`)}
        >
            <div className="flex flex-row items-center">
                <Avatar
                    className="w-8 h-8"
                    address={props.creator}
                    incognito={!props.creator}
                />
                <div className="ml-2 text-sm">
                    <span className="font-semibold">{props.creator ? getName(creator) : 'Someone'}</span>
                    <span className="ml-2">sent you a message</span>
                </div>
            </div>
        </div>
    )
}

function IncomingReactionRow(props: {
    messageId: string;
}): ReactElement {
    const { creator, hash } = parseMessageId(props.messageId);
    const user = useUser(creator);
    const theme = useThemeContext();
    const history = useHistory();

    return (
        <div
            className="flex flex-row cursor-pointer notification-row"
            onClick={() => history.push(`/${creator}/status/${hash}`)}
        >
            <div className="flex flex-row items-center">
                <Avatar
                    className="w-8 h-8"
                    address={creator}
                    incognito={!creator}
                />
                <div className="ml-2 text-sm">
                    <span className="font-semibold">{creator ? getName(user) : 'Someone'}</span>
                    <span className="ml-2">liked your post</span>
                </div>
            </div>
        </div>
    )
}

function IncomingReplyRow(props: {
    messageId: string;
}): ReactElement {
    const { creator, hash } = parseMessageId(props.messageId);
    const user = useUser(creator);
    const theme = useThemeContext();
    const history = useHistory();

    return (
        <div
            className="flex flex-row cursor-pointer notification-row"
            onClick={() => history.push(`/${creator}/status/${hash}`)}
        >
            <div className="flex flex-row items-center">
                <Avatar
                    className="w-8 h-8"
                    address={creator}
                    incognito={!creator}
                />
                <div className="ml-2 text-sm">
                    <span className="font-semibold">{creator ? getName(user) : 'Someone'}</span>
                    <span className="ml-2">replied to your post</span>
                </div>
            </div>
        </div>
    )
}