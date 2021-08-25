import React, {MouseEventHandler, ReactElement, useCallback, useEffect, useState} from "react";
import {useDispatch} from "react-redux";
import {useHistory, useParams} from "react-router";
import {fetchPost, fetchReplies, useGoToPost, useMeta} from "../../ducks/posts";
import classNames from "classnames";
import Post from "../Post";
import {parseMessageId} from "../../util/message";

type Props = {
    level?: number;
    messageId: string;
    className?: string;
    postClassName?: string;
    onClick?: MouseEventHandler;
    clearObserver?: () => void;
    expand?: boolean;
};

export default function Thread(props: Props): ReactElement {
    const { messageId, level = 0 } = props;
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const history = useHistory();
    const dispatch = useDispatch();
    const meta = useMeta(messageId);

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
        props.clearObserver && props.clearObserver();
        setOrder([]);
        await fetchMore();
    }, [fetchMore, messageId]);

    const gotoPost = useGoToPost();

    useEffect(() => {
        (async function onThreadMount() {
            if (!messageId || level >= 3) return;
            await fetchMore(true);
        })();
    }, [messageId, level]);

    return (
      <div
          className={classNames('thread', props.className)}
      >
          <Post
              className={classNames("hover:bg-gray-50", props.postClassName)}
              messageId={messageId}
              onClick={props.onClick}
          />
          <div
              className={classNames(
                  'pl-4',
                  'bg-white',
                  'thread__content',
              )}
          >
              {
                  order.map(messageId => {
                      return (
                          <div className="pt-1 bg-white">
                              <Thread
                                  key={messageId}
                                  level={level + 1}
                                  postClassName={classNames(
                                      "transition-colors cursor-pointer",
                                      "border-l-4 bg-gray-50 mr-1 hover:border-gray-400",
                                  )}
                                  messageId={messageId}
                                  onClick={e => {
                                      e.stopPropagation();
                                      gotoPost(messageId);
                                  }}
                                  clearObserver={props.clearObserver}
                              />
                          </div>
                      );
                  })
              }
              {
                  order.length < meta.replyCount && (
                      <div
                          className={classNames(
                              "flex flex-row flex-nowrap items-center justify-center",
                              "p-4 bg-white text-blue-400 hover:text-blue-300 cursor-pointer hover:underline",
                              "border-t border-gray-100"
                          )}
                          onClick={showMore}
                      >
                          Show More
                      </div>
                  )
              }
          </div>
      </div>
    );
}
