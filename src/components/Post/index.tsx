import React, {ReactElement, useState} from "react";
import classNames from "classnames";
import moment from "moment";
import {usePost} from "../../ducks/posts";
import {useUser} from "../../ducks/users";
import Avatar from "../Avatar";
import "../../util/variable.scss";
import Icon from "../Icon";
import "./post.scss";

type Props = {
    messageId: string;
    className?: string;
};

export default function Post(props: Props): ReactElement {
    const post = usePost(props.messageId);
    const user = post && useUser(post.creator);

    if (!post || !user) return <></>;

    return (
        <div
            className={classNames(
                'flex flex-row flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'rounded-xl',
                'post',
                props.className,
            )}
        >
            <Avatar className="mr-3 w-12 h-12" address={user.address} />
            <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                <div className="flex flex-row flex-nowrap items-center text-light w-full">
                    <div className="font-bold text-base mr-1">{user.name}</div>
                    <div className="text-gray-400 mr-1">@{user.name}</div>
                    <div className="text-gray-400 mr-1">•</div>
                    <div className="text-gray-400">
                        {moment(post.createdAt).fromNow(true)}
                    </div>
                    <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                        <Icon
                            className="text-gray-400 hover:text-gray-800"
                            fa="fas fa-ellipsis-h"
                            onClick={() => null}
                        />
                    </div>
                </div>
                <div className="text-light mt-1 mb-2">
                    {post.payload.content}
                </div>
                <div className="flex flex-row flex-nowrap items-center post__footer">
                    <PostButton
                        fa="far fa-comments"
                        count={post.meta.replyCount}
                    />
                    <PostButton
                        fa="fas fa-retweet"
                        count={post.meta.repostCount}
                    />
                    <PostButton
                        fa="far fa-heart"
                        count={post.meta.likeCount}
                    />
                </div>
            </div>
        </div>
    );
}

type PostButtonProps = {
    fa: string;
    count: number;
}

function PostButton(props: PostButtonProps): ReactElement {
    return (
        <div
            className={classNames(
                'flex flex-row flex-nowrap items-center',
                'post-button',
            )}
        >
            <Icon fa={props.fa} />
            <span className="ml-2">{props.count}</span>
        </div>
    );
}