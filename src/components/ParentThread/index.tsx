import React, {MouseEventHandler, ReactElement} from "react";
import {usePost} from "../../ducks/posts";
import Post from "../Post";
import {useHistory} from "react-router";
import {PostMessageSubType} from "../../util/message";

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
                messageId={parent}
            />
            <Post
                messageId={parent}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => history.push(`/${creator}/status/${hash}`)}
                isParent
            />
        </>
    );
}