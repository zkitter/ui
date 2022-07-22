import "./chat-content.scss";
import React, {ReactElement, useState, KeyboardEvent} from "react";
import classNames from "classnames";
import {useParams} from "react-router";
import InfiniteScrollable from "../InfiniteScrollable";
import {useSelectedLocalId} from "../../ducks/worker";
import Nickname from "../Nickname";
import Avatar, {Username} from "../Avatar";
import Textarea from "../Textarea";

export default function ChatContent(): ReactElement {
    const { receiver, messageId } = useParams<{receiver: string; messageId?: string}>();
    const selected = useSelectedLocalId();
    const [content, setContent] = useState('');

    const onEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
        }
    }

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

            </InfiniteScrollable>
            <div className="chat-content__editor-wrapper">
                <Avatar
                    className="w-8 h-8 m-2"
                    address={selected?.address}
                />
                <div className="chat-content__editor">
                    <Textarea
                        className="text-light border mr-2 my-2"
                        rows={Math.max(0, content.split('\n').length)}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        onKeyPress={onEnter}
                    />
                </div>
            </div>
        </div>
    );
}