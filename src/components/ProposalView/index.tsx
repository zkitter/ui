import React, {ReactElement, useCallback, useEffect, useRef, useState} from "react";
import {useHistory, useParams} from "react-router";
import {fetchMeta, fetchReplies, useMeta, usePost} from "../../ducks/posts";
import Post from "../Post";
import classNames from "classnames";
import "./proposal-view.scss";
import {useDispatch} from "react-redux";
import Thread from "../Thread";
import ParentThread from "../ParentThread";
import {PostMessageSubType} from "../../util/message";
import {useENSName, useLoggedIn} from "../../ducks/web3";
import {fetchProposal, useProposal} from "../../ducks/snapshot";
import Proposal from "../Proposal";

type Props = {

}

let cachedObserver: any = null;

export default function ProposalView(props: Props): ReactElement {
    const {proposalId} = useParams<{proposalId: string;}>();

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

    const proposal = useProposal(proposalId);

    useEffect(() => {
        (async function onPostViewMount() {
            setOrder([]);
            // await dispatch(fetchMeta(messageId));
            await fetchMore(true);
        })();

    }, [loggedIn, ensName, proposalId]);

    useEffect(() => {
        if (!proposal) {
            dispatch(fetchProposal(proposalId));
        }
    }, [proposal])

    const fetchMore = useCallback(async (reset = false) => {
        if (reset) {
            const messageIds: any = await dispatch(fetchReplies(proposalId, 20, 0));
            setOffset(messageIds.length);
            setOrder(messageIds);
        } else {
            const messageIds: any = await dispatch(fetchReplies(proposalId, limit, offset));
            setOffset(offset + messageIds.length);
            setOrder(order.concat(messageIds));
        }
    }, [limit, offset, order, proposalId]);

    const showMore = useCallback(async () => {
        if (cachedObserver) {
            cachedObserver.unobserve(containerEl.current);
            cachedObserver.disconnect();
            cachedObserver = null;
        }
        await fetchMore();
    }, [containerEl, fetchMore, proposalId]);

    const clearObserver = useCallback(async () => {
        if (cachedObserver) {
            cachedObserver.unobserve(containerEl.current);
            cachedObserver.disconnect();
            cachedObserver = null;
        }
    }, [containerEl, fetchMore, proposalId]);

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
    }, [containerEl, proposalId]);

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
                    <Proposal
                        className="rounded-xl"
                        id={proposalId}
                        expand
                    />
                    {
                        order.map((messageId, index) => {
                            const [creator, hash] = messageId.split('/');

                            return (
                                <Thread
                                    key={index}
                                    className="transition-colors cursor-pointer border-t border-gray-200 hover:bg-gray-50"
                                    postClassName="rounded-xl"
                                    messageId={messageId}
                                    clearObserver={clearObserver}
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
                    {
                        order.length < 0 && (
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