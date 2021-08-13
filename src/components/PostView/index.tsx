import React, {ReactElement, useEffect, useRef, useState} from "react";
import {useHistory, useLocation, useParams} from "react-router";
import {fetchPost, fetchPosts, fetchReplies, usePost} from "../../ducks/posts";
import Post from "../Post";
import classNames from "classnames";
import "./post-view.scss";
import {useDispatch} from "react-redux";
import Thread from "../Thread";
import ParentThread from "../ParentThread";
import {PostMessageSubType} from "../../util/message";

type Props = {

}

export default function PostView(props: Props): ReactElement {
    const {name, hash} = useParams<{name: string; hash: string}>();
    const reference = name + '/' + hash;

    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const dispatch = useDispatch();
    const history = useHistory();
    const parentEl = useRef<HTMLDivElement>(null);
    const containerEl = useRef<HTMLDivElement>(null);
    const scrollEl = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(window.innerHeight);

    const originalPost = usePost(reference);
    const messageId = originalPost?.subtype === PostMessageSubType.Repost
        ? originalPost.payload.reference
        : reference;

    useEffect(() => {
        (async function onPostViewMount() {
            if (!messageId) return;

            const messageIds: any = await dispatch(fetchReplies(messageId, limit, offset));

            if (messageIds.length) {
                setOrder(messageIds);
            }
        })();
    }, [messageId]);

    useEffect(() => {
        setOrder([]);
    }, [reference]);

    useEffect(() => {
        // @ts-ignore
        const observer = new window.ResizeObserver(() => {
            const rect = containerEl.current?.getBoundingClientRect();
            if (!rect) return;
            setHeight(window.innerHeight + rect.height - 80);
        })
        observer.observe(containerEl.current);
    }, [containerEl]);

    useEffect(() => {
        if (!parentEl.current || !scrollEl.current) return;
        const rect = parentEl.current.getBoundingClientRect();
        scrollEl.current.scrollTop = rect.height;
    }, [height, parentEl, scrollEl]);


    return (
        <div
            className={classNames(
                'flex-grow post-view',
                'mx-4 py-2',
                {},
            )}
            ref={scrollEl}
        >
            <div
                style={{
                    height: height,
                }}
            >
                <div
                    ref={containerEl}
                    className="rounded-xl overflow-hidden border border-gray-100"
                >
                    <div ref={parentEl}>
                        <ParentThread messageId={messageId} />
                    </div>
                    <Post
                        messageId={messageId}
                        expand
                    />
                    {
                        order.map(messageId => {
                            const [creator, hash] = messageId.split('/');

                            return (
                                <Thread
                                    key={messageId}
                                    className="transition-colors cursor-pointer border-t border-gray-100 hover:bg-gray-50"
                                    messageId={messageId}
                                    onClick={() => history.push(`/${creator}/status/${hash}`)}
                                />
                            );
                        })
                    }
                </div>
            </div>
        </div>
    )
}