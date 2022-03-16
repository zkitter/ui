import React, {MouseEventHandler, ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import moment from "moment";
import {
    fetchMeta,
    fetchPost,
    incrementLike,
    incrementReply,
    incrementRepost,
    useMeta,
    usePost
} from "../../ducks/posts";
import {useUser} from "../../ducks/users";
import Avatar from "../Avatar";
import "../../util/variable.scss";
import Icon from "../Icon";
import "./post.scss";
import Editor from "../Editor";
import Modal, {ModalContent, ModalHeader} from "../Modal";
import {
    submitConnection,
    submitModeration,
    submitPost,
    submitRepost,
    useDraft,
    useSubmitting
} from "../../ducks/drafts";
import {useDispatch} from "react-redux";
import {
    ConnectionMessageSubType,
    MessageType,
    ModerationMessageSubType,
    Post as PostMessage,
    PostMessageSubType
} from "../../util/message";
import {useCanNonPostMessage, useLoggedIn} from "../../ducks/web3";
import {useHistory} from "react-router";
import Menuable from "../Menuable";
import {convertMarkdownToDraft, DraftEditor} from "../DraftEditor";
import URLPreview from "../URLPreview";
import {getHandle, getName, getUsername} from "../../util/user";
import {getGroupName} from "../../util/interrep";
import Nickname from "../Nickname";


type Props = {
    messageId: string;
    className?: string;
    onClick?: MouseEventHandler;
    expand?: boolean;
    isParent?: boolean;
    onSuccessPost?: (post: PostMessage) => void;
};

export default function Post(props: Props): ReactElement {
    const {
        expand,
    } = props;
    const originalPost = usePost(props.messageId);
    const referencedPost = usePost(originalPost?.payload.reference);
    const messageId = originalPost?.subtype === PostMessageSubType.Repost
        ? originalPost.payload.reference
        : props.messageId;
    const post = originalPost?.subtype === PostMessageSubType.Repost
        ? referencedPost
        : originalPost;
    const dispatch = useDispatch();

    useEffect(() => {
        if (!post) {
            dispatch(fetchPost(messageId));
            dispatch(fetchMeta(messageId));
        }
    }, [messageId, post]);

    if (!post) return <LoadingPost {...props} />;

    return (
        <>
            { !expand && <RegularPost key={props.messageId} {...props} /> }
            { !!expand && <ExpandedPost key={props.messageId} {...props} /> }
        </>
    );
}

type ReplyEditorModalProps = {
    onClose: () => void;
    messageId: string;
    onSuccessPost?: (post: PostMessage) => void;
}

function ReplyEditorModal(props: ReplyEditorModalProps): ReactElement {
    const { messageId, onClose } = props;
    const dispatch = useDispatch();
    const post = usePost(props.messageId);
    const draft = useDraft(props.messageId);
    const submitting = useSubmitting();

    const submitReply = useCallback(async () => {
        const post: any = await dispatch(submitPost(messageId));

        if (post && props.onSuccessPost) {
            props.onSuccessPost(post);
        }

        dispatch(incrementReply(props.messageId));
        onClose();
    }, [messageId, draft.editorState]);

    return (
        <Modal
            className="w-144"
            onClose={props.onClose}
        >
            <ModalHeader onClose={props.onClose}>
                <b>{`Replying to ${post?.creator}`}</b>
            </ModalHeader>
            <ModalContent className="min-h-64">
                <Editor
                    messageId={messageId}
                    className="reply-editor"
                    editorState={draft.editorState}
                    onPost={submitReply}
                    loading={submitting}
                />
            </ModalContent>
        </Modal>
    );
}

export function ExpandedPost(props: Props): ReactElement {
    const originalPost = usePost(props.messageId);
    const referencedPost = usePost(originalPost?.payload.reference);
    const messageId = originalPost?.subtype === PostMessageSubType.Repost
        ? originalPost.payload.reference
        : props.messageId;
    const post = originalPost?.subtype === PostMessageSubType.Repost
        ? referencedPost
        : originalPost;
    const user = useUser(post?.creator);
    const history = useHistory();
    const [parentCreator, parentHash] = post?.payload.reference.split('/') || [];
    const parentUser = useUser(parentCreator);
    const meta = useMeta(props.messageId);

    const gotoUserProfile = useCallback(e => {
        if (!user || !post?.creator) return;
        e.stopPropagation();
        history.push(`/${user?.ens || user?.username}/`);
    }, [user, post]);

    if (!post) return <></>;

    const editorState = convertMarkdownToDraft(post.payload.content);

    return (
        <div
            className={classNames(
                'flex flex-col flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'post',
                props.className,
            )}
            onClick={props.onClick}
        >
            <div className="flex flex-row flex-nowrap flex-grow-0 flex-shrink-0">
                <Avatar
                    className="mr-3 w-12 h-12"
                    address={user?.address}
                    incognito={post.creator === ''}
                />
                <div className="flex flex-col flex-nowrap items-start text-light w-full cursor-pointer">
                    <div
                        className="font-bold text-base mr-1 hover:underline"
                        onClick={gotoUserProfile}
                    >
                        <Nickname
                            address={user?.address}
                            interepProvider={meta?.interepProvider}
                            interepGroup={meta?.interepGroup}
                        />
                    </div>
                    <div className="text-gray-400 mr-1" onClick={gotoUserProfile}>
                        {getHandle(user)}
                    </div>
                </div>
                <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                    <PostMenu messageId={messageId} />
                </div>
            </div>
            <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                {
                    !!parentCreator && (
                        <div className="flex flex-row flex-nowrap mt-2 items-center text-gray-500">
                            {
                                parentHash
                                    ? (
                                        <span>
                                            Replying to
                                            <span
                                                className="cursor-pointer hover:underline text-primary-color ml-1"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    history.push(`/${getUsername(parentUser)}/`);
                                                }}
                                            >
                                                {`@${getHandle(parentUser)}`}
                                            </span>
                                        </span>
                                    )
                                    : 'Replying to an anonymous user'
                            }
                        </div>
                    )
                }
                <div className="mt-4 mb-2 text-xl w-full">
                    {
                        post.payload.content && (
                            <DraftEditor
                                editorState={editorState}
                                onChange={() => null}
                                readOnly
                            />
                        )
                    }
                    {
                        post.payload.attachment && (
                            <div className="post__attachment py-2">
                                <URLPreview
                                    url={post.payload.attachment}
                                    showAll
                                />
                            </div>
                        )
                    }
                </div>
                <div className="flex flex-row flex-nowrap items-center text-light w-full">
                    <div className="text-gray-500 my-2">
                        {moment(post.createdAt).format('lll')}
                    </div>
                </div>
                <PostFooter
                    messageId={messageId}
                    className="mt-2 pt-3 border-t border-gray-200 w-full"
                    onSuccessPost={props.onSuccessPost}
                    large
                />
            </div>
        </div>
    );
}

export function RegularPost(props: Props): ReactElement {
    const {
        isParent,
    } = props;
    const originalPost = usePost(props.messageId);
    const referencedPost = usePost(originalPost?.payload.reference);
    const messageId = originalPost?.subtype === PostMessageSubType.Repost
        ? originalPost.payload.reference
        : props.messageId;
    const post = originalPost?.subtype === PostMessageSubType.Repost
        ? referencedPost
        : originalPost;
    let user = useUser(post?.creator);
    let op = useUser(originalPost?.creator);
    const history = useHistory();
    const meta = useMeta(post?.toJSON().messageId as string);

    const [parentCreator, parentHash] = post?.payload.reference.split('/') || [];
    const parentUser = useUser(parentCreator);

    const gotoUserProfile = useCallback(e => {
        if (!user || post?.type === MessageType._TWEET) return;
        e.stopPropagation();
        history.push(`/${user?.ens || user?.username}/`);
    }, [user, post?.type]);

    if (!post) return <></>;

    let body = post.payload.content.slice(0, 512);
    body = post.payload.content.length > 512 ? body + '...' : body;

    const editorState = convertMarkdownToDraft(body);

    return (
        <div
            className={classNames(
                'flex flex-col flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'post',
                props.className,
            )}
            onClick={e => {
                e.stopPropagation();
                props.onClick && props.onClick(e);
            }}
        >
            {
                originalPost?.subtype === PostMessageSubType.Repost
                    ? (
                        <div
                            className="post__meta flex flex-row flex-nowrap ml-9 mb-2 items-center text-xs text-gray-500 font-bold ml-6"
                        >
                            <Icon className="mr-2" fa="fas fa-retweet" size={.75}/>
                            {getHandle(op)} Reposted
                        </div>
                    )
                    : null
            }
            <div className="flex flex-row flex-nowrap">
                <div>
                    <Avatar
                        className="mr-3 w-12 h-12 border"
                        address={user?.username}
                        incognito={post.creator === ''}
                        twitterUsername={post.type === MessageType._TWEET ? post.creator : undefined}
                    />
                    { !!isParent && <div className="post__parent-line" /> }
                </div>
                <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink w-0">
                    <div
                        className="flex flex-row flex-nowrap items-center text-light w-full"
                    >
                        {
                            post.type === MessageType._TWEET
                                ? (
                                    <div
                                        className="post__creator-name text-base mr-1 flex flex-row items-center"
                                        onClick={() => window.open(`https://twitter.com/${post?.creator}`, '_blank')}
                                    >
                                        <span className="hover:underline font-bold">
                                            {post.creator}
                                        </span>
                                        <span className="ml-1 font-light text-light text-gray-500">
                                            from twitter.com
                                        </span>
                                    </div>
                                )
                                : (
                                    <div
                                        className="post__creator-name font-bold text-base mr-1 hover:underline"
                                        onClick={gotoUserProfile}
                                    >
                                        <Nickname
                                            address={user?.address}
                                            interepProvider={meta?.interepProvider}
                                            interepGroup={meta?.interepGroup}
                                        />
                                    </div>
                                )
                        }

                        {
                            post.type !== MessageType._TWEET && (
                                <div className="post__creator-username text-gray-400 mr-1" onClick={gotoUserProfile}>
                                    {getHandle(user)}
                                </div>
                            )
                        }
                        <div className="text-gray-400 mr-1">•</div>
                        <div className="post__timestamp text-gray-400 hover:underline" onClick={gotoUserProfile}>
                            {moment(post.createdAt).fromNow(true)}
                        </div>
                        <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                            <PostMenu messageId={messageId} />
                        </div>
                    </div>
                    <div
                        className={classNames(
                            "text-light mt-1 mb-2 w-full relative",
                            {
                                "post__fade-out": post.payload.content.length > 512,
                            }
                        )}
                    >
                        {
                            !!parentCreator && post.type !== MessageType._TWEET && (
                                <div className="flex flex-row flex-nowrap mb-2 items-center text-gray-500">
                                    {
                                        parentHash
                                            ? (
                                                <span>
                                                    Replying to
                                                    <span
                                                        className="cursor-pointer hover:underline text-primary-color ml-1"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            history.push(`/${getUsername(parentUser)}/`);
                                                        }}
                                                    >
                                                        {`@${getHandle(parentUser)}`}
                                                    </span>
                                                </span>
                                            )
                                            : 'Replying to an anonymous user'
                                    }
                                </div>
                            )
                        }

                        {
                            post.payload.content && (
                                <DraftEditor
                                    editorState={editorState}
                                    onChange={() => null}
                                    customStyleMap={{
                                        CODE: {
                                            backgroundColor: '#f6f6f6',
                                            color: '#1c1e21',
                                            padding: '2px 4px',
                                            margin: '0 2px',
                                            borderRadius: '2px',
                                            fontFamily: 'Roboto Mono, monospace',
                                        },
                                    }}
                                    readOnly
                                />
                            )
                        }

                        {
                            post.payload.attachment && (
                                <div className="post__attachment py-2">
                                    <URLPreview
                                        url={post.payload.attachment}
                                    />
                                </div>
                            )
                        }
                    </div>
                    <PostFooter
                        messageId={messageId}
                        onSuccessPost={props.onSuccessPost}
                    />
                </div>
            </div>
        </div>
    );
}

function PostFooter(props: {
    className?: string;
    messageId: string;
    large?: boolean;
    onSuccessPost?: (post: PostMessage) => void;
}): ReactElement {
    const {large, className, messageId} = props;
    const meta = useMeta(messageId);
    const post = usePost(messageId);
    const loggedIn = useLoggedIn();
    const canNonPostMessage = useCanNonPostMessage();
    const dispatch = useDispatch();
    const [showReply, setShowReply] = useState(false);

    const onLike = useCallback(() => {
        dispatch(submitModeration(messageId, ModerationMessageSubType.Like));
        dispatch(incrementLike(messageId));
    }, [messageId]);

    const onRepost = useCallback(() => {
        dispatch(submitRepost(messageId));
        dispatch(incrementRepost(messageId));
    }, [messageId]);

    // @ts-ignore
    const isMirrorTweet = [PostMessageSubType.MirrorPost, PostMessageSubType.MirrorReply].includes(post?.subtype);
    const isTweet = post?.type === MessageType._TWEET;

    return (
        <div
            className={classNames(
                "flex flex-row flex-nowrap items-center w-full",
                "post__footer",
                className,
            )}
        >
            { showReply && (
                <ReplyEditorModal
                    onClose={() => setShowReply(false)}
                    onSuccessPost={props.onSuccessPost}
                    messageId={messageId}
                />
            )}
            <PostButton
                iconClassName="hover:bg-blue-50 hover:text-blue-400"
                fa="far fa-comments"
                count={meta.replyCount}
                onClick={() => setShowReply(true)}
                large={large}
                disabled={isTweet}
            />
            <PostButton
                textClassName={classNames({
                    "text-green-400": meta.reposted,
                })}
                iconClassName={classNames(
                    {
                        "hover:bg-green-50 hover:text-green-400": loggedIn,
                        "text-green-400": meta.reposted,
                    },
                )}
                fa="fas fa-retweet"
                count={meta.repostCount}
                onClick={meta.reposted ? undefined : onRepost}
                disabled={!canNonPostMessage || isTweet}
                large={large}
            />
            <PostButton
                textClassName={classNames({
                    "text-red-400": meta.liked,
                })}
                iconClassName={classNames(
                    {
                        "hover:bg-red-50 hover:text-red-400": loggedIn,
                        "text-red-400": meta.liked,
                    },
                )}
                fa={classNames({
                    "far fa-heart": !meta.liked,
                    "fas fa-heart": meta.liked,
                })}
                count={meta.likeCount}
                onClick={meta.liked ? undefined : onLike}
                disabled={!canNonPostMessage || isTweet}
                large={large}
            />
            {
                isMirrorTweet && (
                    <PostButton
                        iconClassName="hover:bg-blue-50 text-blue-400"
                        fa="fab fa-twitter"
                        onClick={() => {
                            if (!post) return;

                            if ([PostMessageSubType.MirrorPost, PostMessageSubType.MirrorReply].includes(post.subtype)) {
                                window.open(post.payload.topic, '_blank');
                            } else if (post.type === MessageType._TWEET) {
                                window.open(`https://twitter.com/${post.creator}/status/${post.tweetId}`, '_blank');
                            }
                        }}
                        large={large}
                    />
                )
            }
            <div className="flex flex-grow flex-row flex-nowrap justify-end items-center">

            </div>
        </div>
    );
}

function PostMenu(props: Props): ReactElement {
    const post = usePost(props.messageId);
    const user = useUser(post?.creator);
    const dispatch = useDispatch();

    const onBlock = useCallback(() => {
        if (!user) return;
        dispatch(submitConnection(user?.username, ConnectionMessageSubType.Block));
    }, [user]);

    if (post?.type === MessageType._TWEET) {
        return (
            <PostButton
                iconClassName="hover:bg-blue-50 text-blue-400"
                fa="fab fa-twitter"
                onClick={() => {
                    if (!post) return;

                    if ([PostMessageSubType.MirrorPost, PostMessageSubType.MirrorReply].includes(post.subtype)) {
                        window.open(post.payload.topic, '_blank');
                    } else if (post.type === MessageType._TWEET) {
                        window.open(`https://twitter.com/${post.creator}/status/${post.tweetId}`, '_blank');
                    }
                }}
            />
        )
    }

    return (
        <Menuable
            className="post__menu"
            items={[
                user?.meta?.blocked
                    ? {
                        label: `Unblock @${getName(user)}`,
                        iconFA: 'fas fa-user-slash',
                        disabled: true,
                        iconClassName: 'text-gray-400',
                    }
                    : {
                        label: `Block @${getName(user)}`,
                        iconFA: 'fas fa-user-slash',
                        onClick: onBlock,
                        disabled: !!user?.meta?.followed,
                        className: 'block-user-item',
                        iconClassName: 'text-red-400 hover:text-red-800',
                    },
                {
                    label: `Block Post`,
                    iconFA: 'fas fa-ban',
                    className: 'block-user-item',
                    iconClassName: 'text-red-400 hover:text-red-800',
                },
            ]}
        >
            <Icon
                className="text-gray-400 hover:text-gray-800"
                fa="fas fa-ellipsis-h"
                onClick={() => null}
            />
        </Menuable>

    )
}

export function LoadingPost(props: Props): ReactElement {
    if (props.expand) {
        return (
            <div
                className={classNames(
                    'flex flex-col flex-nowrap',
                    'py-3 px-4',
                    'bg-white',
                    'post',
                    props.className,
                )}
            >
                <div className="flex flex-row flex-nowrap flex-grow-0 flex-shrink-0">
                    <div className="mr-3 w-12 h-12 flex-shrink-0 rounded-full bg-gray-50" />
                    <div className="flex flex-col flex-nowrap items-start text-light w-full">
                        <div className="font-bold text-base mr-1 w-24 h-6 bg-gray-50" />
                        <div className="text-gray-400 mr-1 mt-0.5 w-24 h-6 bg-gray-50" />
                    </div>
                    <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                    </div>
                </div>
                <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                    <div className="mt-4 mb-2 text-xl w-24 h-6 bg-gray-50" />
                    <div className="flex flex-row flex-nowrap items-center text-light w-full">
                        <div className="text-gray-500 my-2w-24 h-6 bg-gray-50" />
                    </div>
                    <div className="flex flex-row flex-nowrap items-center mt-2 pt-3 border-t border-gray-100 w-full post__footer">
                        <div className="bg-gray-50 w-12 h-6 mr-8" />
                        <div className="bg-gray-50 w-12 h-6 mr-8" />
                        <div className="bg-gray-50 w-12 h-6 mr-8" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className={classNames(
                'flex flex-row flex-nowrap',
                'py-3 px-4',
                'bg-white',
                'post',
                props.className,
            )}
        >
            <div className="mr-3 w-12 h-12 rounded-full bg-gray-50" />
            <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
                <div className="flex flex-row flex-nowrap items-center text-light w-full">
                    <div className="font-bold text-base mr-1 w-24 h-6 bg-gray-50" />
                    <div className="text-gray-400 mr-1 w-24 h-6 bg-gray-50" />
                    <div className="text-gray-400 w-24 h-6 bg-gray-50" />
                    <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
                    </div>
                </div>
                <div className="text-light mt-1 mb-2 w-80 h-6 bg-gray-50" />
                <div className="flex flex-row flex-nowrap items-center post__footer">
                    <div className="bg-gray-50 w-8 h-4 mr-8 ml-1" />
                    <div className="bg-gray-50 w-8 h-4 mr-8" />
                    <div className="bg-gray-50 w-8 h-4 mr-8" />
                </div>
            </div>
        </div>
    );
}

type PostButtonProps = {
    fa: string;
    count?: number;
    onClick?: MouseEventHandler;
    large?: boolean;
    className?: string;
    iconClassName?: string;
    textClassName?: string;
    disabled?: boolean;
}

export function PostButton(props: PostButtonProps): ReactElement {
    return (
        <button
            className={classNames(
                'flex flex-row flex-nowrap items-center',
                'post-button',
                props.className,
                {
                    'cursor-default opacity-50': props.disabled,
                }
            )}
            onClick={e => {
                e.stopPropagation();
                if (props.disabled) return;
                props.onClick && props.onClick(e);
            }}
        >
            <Icon
                className={classNames(
                    {
                        'p-1.5 w-8 h-8': !props.large,
                        'p-2 w-10 h-10': props.large,
                    },
                    props.iconClassName,
                )}
                fa={props.fa}
                size={props.large ? 1.25 : 1}
            />
            <span
                className={classNames("ml-1", {
                    'text-lg': props.large,
                }, props.textClassName)}
            >
                {props.count}
            </span>
        </button>
    );
}