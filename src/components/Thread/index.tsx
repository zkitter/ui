import classNames from 'classnames';
import React, { MouseEventHandler, ReactElement, useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { usePostModeration } from '@ducks/mods';
import { fetchReplies, useGoToPost, useMeta } from '@ducks/posts';
import { Post as PostMessage } from '~/message';
import Post from '../Post';
import { useThemeContext } from '../ThemeContext';

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
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const dispatch = useDispatch();
  const meta = useMeta(messageId);
  const modOverride = usePostModeration(meta?.rootId);
  const [end, setEnd] = useState(false);
  const theme = useThemeContext();

  const fetchMore = useCallback(
    async (reset = false) => {
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
    },
    [limit, offset, order, messageId]
  );

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
    <div className={classNames('thread', props.className)}>
      <Post
        className={classNames('mb-0.5', props.postClassName)}
        messageId={messageId}
        onClick={props.onClick}
        onSuccessPost={props.onSuccessPost}
      />
      <div className={classNames('pl-4', 'thread__content')}>
        {order.map(messageId => {
          return (
            <div key={messageId} className="pt-1">
              <Thread
                key={messageId}
                level={level + 1}
                postClassName={classNames('transition-colors cursor-pointer', 'border-l-4 mr-1', {
                  'hover:border-gray-300 border-gray-200 bg-gray-50 ': theme !== 'dark',
                  'hover:border-gray-700 border-gray-800 bg-gray-900': theme === 'dark',
                })}
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
        })}
        {!end && order.length < meta.replyCount && (
          <div
            className={classNames(
              'flex flex-row flex-nowrap items-center justify-center',
              'p-4 text-blue-400 hover:text-blue-300 cursor-pointer hover:underline',
              'border-t',
              {
                'border-gray-200 bg-white': theme !== 'dark',
                'border-gray-800 bg-dark': theme === 'dark',
              }
            )}
            onClick={showMore}>
            Show More
          </div>
        )}
      </div>
    </div>
  );
}
