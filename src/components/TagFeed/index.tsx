import React, {ReactElement, useCallback, useEffect, useState} from "react";
import classNames from "classnames";
import Post from "../Post";
import {useDispatch} from "react-redux";
import {fetchHomeFeed, fetchTagFeed, useGoToPost} from "../../ducks/posts";
import "./tag-feed.scss";
import {useLoggedIn} from "../../ducks/web3";
import {useHistory, useParams} from "react-router";
import InfiniteScrollable from "../InfiniteScrollable";

export default function TagFeed(): ReactElement {
    const {tagName} = useParams<{tagName: string}>();
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const dispatch = useDispatch();
    const history = useHistory();
    const loggedIn = useLoggedIn();
    const tag = decodeURIComponent(tagName);

    useEffect(() => {
        (async function onTagFeedMount() {
            setOrder([]);
            setOffset(0);
            await fetchMore(true);
        })();
    }, [loggedIn, tag]);

    const fetchMore = useCallback(async (reset = false) => {
        if (reset) {
            const messageIds: any = await dispatch(fetchTagFeed(tag, 20, 0));
            setOffset(20);
            setOrder(messageIds);
        } else {
            if (order.length % limit) return;
            const messageIds: any = await dispatch(fetchTagFeed(tag, limit, offset));
            setOffset(offset + limit);
            setOrder(order.concat(messageIds));
        }
    }, [limit, offset, order, tag]);

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