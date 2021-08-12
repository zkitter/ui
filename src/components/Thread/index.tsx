import React, {MouseEventHandler, ReactElement, useEffect, useState} from "react";
import {useDispatch} from "react-redux";
import {useHistory, useParams} from "react-router";
import {fetchPost, fetchReplies} from "../../ducks/posts";
import classNames from "classnames";
import Post from "../Post";

type Props = {
    level?: number;
    messageId: string;
    className?: string;
    postClassName?: string;
    onClick?: MouseEventHandler;
    expand?: boolean;
};


export default function Thread(props: Props): ReactElement {
    const { messageId, level = 0 } = props;
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [order, setOrder] = useState<string[]>([]);
    const history = useHistory();
    const dispatch = useDispatch();

    useEffect(() => {
        (async function onThreadMount() {
            if (!messageId || level >= 3) return;

            const messageIds: any = await dispatch(fetchReplies(messageId, limit, offset));

            if (messageIds.length) {
                setOrder(messageIds);
            }

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
                      const [creator, hash] = messageId.split('/');

                      return (
                          <div className="py-1 bg-white">
                              <Thread
                                  key={messageId}
                                  level={level + 1}
                                  postClassName={classNames(
                                      "transition-colors cursor-pointer",
                                      "border-l-4 bg-gray-50 mr-1 hover:border-gray-400",
                                  )}
                                  messageId={messageId}
                                  onClick={() => history.push(`/${creator}/status/${hash}`)}
                              />
                          </div>
                      );
                  })
              }
          </div>
      </div>
    );
}
