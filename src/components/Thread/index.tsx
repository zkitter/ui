import React, {MouseEventHandler, ReactElement, useCallback, useEffect, useState} from "react";
import {useDispatch} from "react-redux";
import {useHistory, useParams} from "react-router";
import {fetchPost, fetchReplies, useGoToPost, useMeta} from "../../ducks/posts";
import classNames from "classnames";
import Post from "../Post";
import {parseMessageId, Post as PostMessage} from "../../util/message";
import {usePostModeration} from "../../ducks/mods";

type Props = {
    level?: number;
    messageId: string;
    className?: string;
    postClassName?: string;
    onClick?: MouseEventHandler;
    clearObserver?: () => void;
    expand?: boolean;
    onSuccessPost?: (post: PostMessage) => void;
};

export default function Thread(props: Props): ReactElement {
    const { messageId, level = 0 } = props;
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const history = useHistory();
    const dispatch = useDispatch();
    const meta = useMeta(messageId);
    const modOverride = usePostModeration(meta?.rootId);
    const [end, setEnd] = useState(false);

    console.log(end);
    const fetchMore = useCallback(async (reset = false) => {
        let messageIds: any;
        if (reset) {
            messageIds = await dispatch(fetchReplies(messageId, 20, 0));
            setOffset(messageIds.length);
            setOrder(messageIds);
        } else {
            messageIds = await dispatch(fetchReplies(messageId, limit, offset));
            setOffset(offset + messageIds.length);
            setOrder(order.concat(messageIds));
        }

        if (!messageIds.length) {
            setEnd(true);
        } else {
            setEnd(false);
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
    }, [messageId, level, modOverride?.unmoderated]);

    return (
      <div
          className={classNames('thread', props.className)}
      >
          <Post
              className={classNames("hover:bg-gray-50 mb-0.5", props.postClassName)}
              messageId={messageId}
              onClick={props.onClick}
              onSuccessPost={props.onSuccessPost}
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
                          <div key={messageId} className="pt-1 bg-white">
                              <Thread
                                  key={messageId}
                                  level={level + 1}
                                  postClassName={classNames(
                                      "transition-colors cursor-pointer",
                                      "border-l-4 bg-gray-50 mr-1 hover:border-gray-300",
                                  )}
                                  messageId={messageId}
                                  onClick={e => {
                                      e.stopPropagation();
                                      gotoPost(messageId);
                                  }}
                                  clearObserver={props.clearObserver}
                                  onSuccessPost={props.onSuccessPost}
                              />
                          </div>
                      );
                  })
              }
              {
                  !end && order.length < meta.replyCount && (
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
