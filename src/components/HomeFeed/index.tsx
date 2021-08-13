import React, {ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import {EditorState} from 'draft-js';
import Post from "../Post";
import {useDispatch} from "react-redux";
import {fetchPosts} from "../../ducks/posts";
import "./home-feed.scss";
import Editor from "../Editor";
import {useLoggedIn} from "../../ducks/web3";
import {setDraft, submitPost, useDraft} from "../../ducks/drafts";
import {useHistory} from "react-router";

export default function HomeFeed(): ReactElement {
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const dispatch = useDispatch();
    const history = useHistory();

    useEffect(() => {
        (async function onHomeFeedMount() {
            const messageIds: any = await dispatch(fetchPosts(undefined, limit, offset));
            setOrder(order.concat(messageIds));
        })();
    }, []);

    return (
        <div
            className={classNames('flex-grow home-feed',
                'px-4 py-2',
                {},
            )}
        >
            <PostEditor />
            {
                order.map(messageId => {
                    const [creator, hash] = messageId.split('/');

                    return (
                        <Post
                            key={messageId}
                            className="rounded-xl transition-colors mb-1 hover:border-gray-400 cursor-pointer border border-gray-100"
                            messageId={messageId}
                            onClick={() => history.push(`/${creator}/status/${hash}`)}
                        />
                    );
                })
            }

        </div>
    );
}

function PostEditor(): ReactElement {
    const dispatch = useDispatch();
    const loggedIn = useLoggedIn();
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
        />
    );
}