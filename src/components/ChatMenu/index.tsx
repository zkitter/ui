import "./chat-menu.scss";
import React, {MouseEventHandler, ReactElement, useEffect, useState} from "react";
import classNames from "classnames";
import Avatar, {Username} from "../Avatar";
import {useSelectedLocalId} from "../../ducks/worker";
import moment from "moment";
import config from "../../util/config";
import Nickname from "../Nickname";
import {useHistory, useParams} from "react-router";

export default function ChatMenu(): ReactElement {
    const selected = useSelectedLocalId();
    const history = useHistory();
    const [chats, setChats] = useState<{
        type: 'DIRECT' | 'PUBLIC_ROOM';
        receiver: string;
    }[]>([]);

    useEffect(() => {
        (async () => {
            const res = await fetch(`${config.indexerAPI}/v1/zkchat/users`);
            const json = await res.json();
            setChats(json.payload.map((data: any) => ({
                type: 'DIRECT',
                receiver: data.wallet_address,
            })))
        })();
    }, []);

    if (!selected) return <></>;

    return (
        <div className="chat-menu">
            { chats.map((chat) => (
                <ChatMenuItem
                    key={chat.type + chat.receiver}
                    type={chat.type}
                    receiver={chat.receiver}
                    onClick={() => {
                        history.push(`/chat/dm/${chat.receiver}`);
                    }}
                />
            ))}
        </div>
    );
};

const ONE_MIN = 60 * 1000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;

function ChatMenuItem(props: {
    type: 'DIRECT' | 'PUBLIC_ROOM';
    receiver: string;
    onClick: MouseEventHandler;
}): ReactElement {
    const params = useParams<{receiver?: string}>();

    console.log(params);
    return (
        <div
            className={classNames("flex flex-row chat-menu__item", {
                'chat-menu__item--selected': params.receiver === props.receiver,
            })}
            onClick={props.onClick}
        >
            <Avatar
                className="w-12 h-12 flex-grow-0 flex-shrink-0"
                address={props.receiver}
            />
            <div className="flex flex-col flex-grow flex-shrink mx-4 w-0">
                <Nickname className="font-bold truncate" address={props.receiver} />
                <div className="text-sm text-gray-800 truncate">sudsfasdfasdfasdfasdfasdfasdfasdfasdfasfasfp?</div>
            </div>
            <div className="flex-grow-0 flex-shrink-0 mt-1 text-gray-500">
                <FromNow className="text-xs" timestamp={new Date(Date.now() - ONE_HOUR * Math.random())} />
            </div>
        </div>
    )
}


function FromNow(props: {
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