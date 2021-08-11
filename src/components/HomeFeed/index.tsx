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

export default function HomeFeed(): ReactElement {
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const dispatch = useDispatch();
    const loggedIn = useLoggedIn();
    const draft = useDraft();

    const onChange = useCallback((newEditorState: EditorState) => {
        dispatch(setDraft(newEditorState));
    }, [draft]);

    const onPost = useCallback(async () => {
        dispatch(submitPost());
    }, [draft]);

    useEffect(() => {
        (async function onHomeFeedMount() {
            const messageIds: any = await dispatch(fetchPosts(limit, offset));
            setOrder(order.concat(messageIds));
        })();
    }, []);

    return (
        <div
            className={classNames('flex-grow home-feed',
                'm-4',
                {},
            )}
        >
            <Editor
                className={classNames("mb-2 transition-shadow", {
                    'focus-within:shadow-lg': loggedIn,
                })}
                editorState={draft.editorState}
                onChange={onChange}
                onPost={onPost}
            />
            { order.map(messageId => (
                <Post
                    key={messageId}
                    className="transition-colors shadow-sm mb-2 hover:shadow-lg hover:bg-gray-50 cursor-pointer"
                    messageId={messageId}
                />
            )) }
        </div>
    );
}