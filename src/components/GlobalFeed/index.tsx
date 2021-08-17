import React, {ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import {EditorState} from 'draft-js';
import Post from "../Post";
import {useDispatch} from "react-redux";
import {fetchPosts} from "../../ducks/posts";
import "./global-feed.scss";
import Editor from "../Editor";
import {useLoggedIn} from "../../ducks/web3";
import {setDraft, submitPost, useDraft, useSubmitting} from "../../ducks/drafts";
import {useHistory} from "react-router";
import InfiniteScrollable from "../InfiniteScrollable";

export default function GlobalFeed(): ReactElement {
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const dispatch = useDispatch();
    const history = useHistory();
    const loggedIn = useLoggedIn();

    useEffect(() => {
        (async function onGlobalFeedMount() {
            await fetchMore(true);
        })();
    }, [loggedIn]);

    const fetchMore = useCallback(async (reset = false) => {
        if (reset) {
            const messageIds: any = await dispatch(fetchPosts(undefined, 20, 0));
            setOffset(20);
            setOrder(messageIds);
        } else {
            if (order.length % limit) return;
            const messageIds: any = await dispatch(fetchPosts(undefined, limit, offset));
            setOffset(offset + limit);
            setOrder(order.concat(messageIds));
        }
    }, [limit, offset, order]);

    return (
        <InfiniteScrollable
            className={classNames('flex-grow global-feed',
                'mx-4 py-2',
                {},
            )}
            bottomOffset={128}
            onScrolledToBottom={fetchMore}
        >
            <PostEditor />
            {
                order.map((messageId, i) => {
                    const [creator, hash] = messageId.split('/');

                    return (
                        <Post
                            key={messageId}
                            // key={i}
                            className="rounded-xl transition-colors mb-1 hover:border-gray-400 cursor-pointer border border-gray-100"
                            messageId={messageId}
                            onClick={() => {
                                if (!hash) {
                                    history.push(`/post/${creator}`)

                                } else {
                                    history.push(`/${creator}/status/${hash}`)
                                }
                            }}
                        />
                    );
                })
            }
        </InfiniteScrollable>
    );
}

function PostEditor(): ReactElement {
    const dispatch = useDispatch();
    const loggedIn = useLoggedIn();
    const submitting = useSubmitting();
    const draft = useDraft();

    const onChange = useCallback((newEditorState: EditorState) => {
        dispatch(setDraft(newEditorState));
    }, [draft]);

    const onPost = useCallback(async () => {
        dispatch(submitPost());
    }, [draft]);

    return (
        <Editor
            className={classNames("mb-1 transition-shadow border border-gray-100", {
                'focus-within:border-gray-400': loggedIn,
            })}
            editorState={draft.editorState}
            onChange={onChange}
            onPost={onPost}
            loading={submitting}
        />
    );
}