import React, {MouseEventHandler, ReactElement} from "react";
import {usePost} from "../../ducks/posts";
import Post from "../Post";
import {useHistory} from "react-router";
import {PostMessageSubType} from "../../util/message";
import classNames from "classnames";

type Props = {
    level?: number;
    messageId: string;
    className?: string;
    postClassName?: string;
    onClick?: MouseEventHandler;
    expand?: boolean;
};

export default function ParentThread(props: Props): ReactElement {
    const post = usePost(props.messageId);
    const history = useHistory();
    const parent = post?.subtype === PostMessageSubType.Reply
        ? post?.payload.reference
        : '';
    const [creator, hash] = parent.split('/');

    if (!parent) return <></>;

    return (
        <>
            <ParentThread
                className={props.className}
                messageId={parent}
            />
            <Post
                messageId={parent}
                className={classNames("cursor-pointer hover:bg-gray-50", props.className)}
                onClick={() => {
                    if (!hash) {
                        history.push(`/post/${creator}`)

                    } else {
                        history.push(`/${creator}/status/${hash}`)
                    }
                }}
                isParent
            />
        </>
    );
}