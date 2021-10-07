import React, {ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import {EditorState} from 'draft-js';
import Post from "../Post";
import {useDispatch} from "react-redux";
import {fetchHomeFeed, setPost, useGoToPost} from "../../ducks/posts";
import "./home-feed.scss";
import Editor from "../Editor";
import {useLoggedIn} from "../../ducks/web3";
import {Post as PostMessage} from "../../util/message";
import {setDraft, submitPost, useDraft, useSubmitting} from "../../ducks/drafts";
import InfiniteScrollable from "../InfiniteScrollable";

export default function HomeFeed(): ReactElement {
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const dispatch = useDispatch();
    const loggedIn = useLoggedIn();

    useEffect(() => {
        (async function onGlobalFeedMount() {
            await fetchMore(true);
        })();
    }, [loggedIn]);

    const fetchMore = useCallback(async (reset = false) => {
        if (reset) {
            const messageIds: any = await dispatch(fetchHomeFeed(20, 0));
            setOffset(20);
            setOrder(messageIds);
        } else {
            if (order.length % limit) return;
            const messageIds: any = await dispatch(fetchHomeFeed(limit, offset));
            setOffset(offset + limit);
            setOrder(order.concat(messageIds));
        }
    }, [limit, offset, order]);

    const onSuccessPost = useCallback((post: PostMessage) => {
        const hash = post.hash();
        const messageId = post.creator ? post.creator + '/' + hash : hash;
        dispatch(setPost(post));
        setOrder([messageId, ...order]);
    }, [order]);

    const gotoPost = useGoToPost();

    return (
        <InfiniteScrollable
            className={classNames('flex-grow home-feed',
                'mx-4 py-2',
                {},
            )}
            bottomOffset={128}
            onScrolledToBottom={fetchMore}
        >
            <PostEditor onSuccessPost={onSuccessPost} />
            {
                order.map((messageId, i) => {
                    return (
                        <Post
                            key={messageId}
                            // key={i}
                            className="rounded-xl transition-colors mb-1 hover:border-gray-400 cursor-pointer border border-gray-200"
                            messageId={messageId}
                            onClick={() => gotoPost(messageId)}
                        />
                    );
                })
            }
        </InfiniteScrollable>
    );
}

function PostEditor(props: {
    onSuccessPost: (post: PostMessage) => void;
}): ReactElement {
    const dispatch = useDispatch();
    const loggedIn = useLoggedIn();
    const submitting = useSubmitting();
    const draft = useDraft();

    const onPost = useCallback(async () => {
        const post: any = await dispatch(submitPost());

        if (post) {
            props.onSuccessPost(post);
        }
    }, [draft]);

    return (
        <Editor
            messageId=""
            className={classNames("mb-1 transition-shadow border border-gray-200 mobile-hidden", {
                'focus-within:border-gray-400': loggedIn,
            })}
            editorState={draft.editorState}
            onPost={onPost}
            loading={submitting}
        />
    );
}