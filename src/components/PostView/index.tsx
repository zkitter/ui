import React, {ReactElement, useCallback, useEffect, useRef, useState} from "react";
import {useHistory, useLocation, useParams} from "react-router";
import {
    fetchHomeFeed,
    fetchMeta,
    fetchPost,
    fetchPosts,
    fetchReplies,
    useGoToPost,
    useMeta,
    usePost
} from "../../ducks/posts";
import Post from "../Post";
import classNames from "classnames";
import "./post-view.scss";
import {useDispatch} from "react-redux";
import Thread from "../Thread";
import ParentThread from "../ParentThread";
import {parseMessageId, PostMessageSubType} from "../../util/message";
import {useENSName, useLoggedIn} from "../../ducks/web3";
import {fetchProposal} from "../../ducks/snapshot";

type Props = {

}

let cachedObserver: any = null;

export default function PostView(props: Props): ReactElement {
    const {name, hash} = useParams<{name?: string; hash: string}>();
    const reference = name ? name + '/' + hash : hash;

    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const dispatch = useDispatch();
    const history = useHistory();
    const loggedIn = useLoggedIn();
    const ensName = useENSName();
    const parentEl = useRef<HTMLDivElement>(null);
    const containerEl = useRef<HTMLDivElement>(null);
    const scrollEl = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(window.innerHeight);

    const originalPost = usePost(reference);
    const messageId = originalPost?.subtype === PostMessageSubType.Repost
        ? originalPost.payload.reference
        : reference;
    const meta = useMeta(messageId);

    useEffect(() => {
        (async function onPostViewMount() {
            setOrder([]);
            await dispatch(fetchMeta(messageId));
            await fetchMore(true);
        })();

    }, [loggedIn, ensName, messageId]);

    const gotoPost = useGoToPost();

    const fetchMore = useCallback(async (reset = false) => {
        if (reset) {
            const messageIds: any = await dispatch(fetchReplies(messageId, 20, 0));
            setOffset(messageIds.length);
            setOrder(messageIds);
        } else {
            const messageIds: any = await dispatch(fetchReplies(messageId, limit, offset));
            setOffset(offset + messageIds.length);
            setOrder(order.concat(messageIds));
        }
    }, [limit, offset, order, messageId]);

    const showMore = useCallback(async () => {
        if (cachedObserver) {
            cachedObserver.unobserve(containerEl.current);
            cachedObserver.disconnect();
            cachedObserver = null;
        }
        await fetchMore();
    }, [containerEl, fetchMore, messageId]);

    const clearObserver = useCallback(async () => {
        if (cachedObserver) {
            cachedObserver.unobserve(containerEl.current);
            cachedObserver.disconnect();
            cachedObserver = null;
        }
    }, [containerEl, fetchMore, messageId]);

    useEffect(() => {
        if (cachedObserver) {
            cachedObserver.unobserve(containerEl.current);
            cachedObserver.disconnect();
        }
        // @ts-ignore
        const observer = new window.ResizeObserver(() => {
            const rect = containerEl.current?.getBoundingClientRect();
            if (!rect) return;
            setHeight(window.innerHeight + rect.height - 80);
        })
        observer.observe(containerEl.current);
        cachedObserver = observer;
    }, [containerEl, messageId]);

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
                    className="rounded-xl overflow-visible border border-gray-200"
                >
                    <div ref={parentEl}>
                        <ParentThread
                            className="rounded-xl"
                            messageId={messageId}
                        />
                    </div>
                    <Post
                        className="rounded-xl"
                        messageId={messageId}
                        expand
                    />
                    {
                        order.map((messageId, index) => {
                            return (
                                <Thread
                                    key={messageId}
                                    className="transition-colors cursor-pointer border-t border-gray-200 hover:bg-gray-50"
                                    postClassName="rounded-xl"
                                    messageId={messageId}
                                    clearObserver={clearObserver}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        gotoPost(messageId);
                                    }}
                                />
                            );
                        })
                    }
                    {
                        order.length < meta.replyCount && (
                            <div
                                className={classNames(
                                    "flex flex-row flex-nowrap items-center justify-center",
                                    "p-4 bg-white text-blue-400 hover:text-blue-300 cursor-pointer hover:underline",
                                    "border-t border-gray-200"
                                )}
                                onClick={showMore}
                            >
                                Show More
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    )
}