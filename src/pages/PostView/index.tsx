import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { fetchMeta, fetchReplies, setPost, useGoToPost, useMeta, usePost } from '@ducks/posts';
import Post from '@components/Post';
import classNames from 'classnames';
import './post-view.scss';
import { useDispatch } from 'react-redux';
import Thread from '@components/Thread';
import ParentThread from '@components/ParentThread';
import { Post as PostMessage, PostMessageSubType } from '~/message';
import { useENSName } from '@ducks/web3';
import { useSelectedLocalId } from '@ducks/worker';
import { usePostModeration } from '@ducks/mods';
import { useThemeContext } from '@components/ThemeContext';

type Props = {};

let cachedObserver: any = null;

export default function PostView(props: Props): ReactElement {
  const { name, hash } = useParams<{ name?: string; hash: string }>();
  const reference = name ? name + '/' + hash : hash;

  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const dispatch = useDispatch();
  const ensName = useENSName();
  const parentEl = useRef<HTMLDivElement>(null);
  const containerEl = useRef<HTMLDivElement>(null);
  const scrollEl = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(window.innerHeight);
  const selected = useSelectedLocalId();
  const originalPost = usePost(reference);
  const messageId =
    originalPost?.subtype === PostMessageSubType.Repost
      ? originalPost.payload.reference
      : reference;
  const meta = useMeta(messageId);
  const modOverride = usePostModeration(meta?.rootId);
  const [end, setEnd] = useState(false);
  const theme = useThemeContext();

  useEffect(() => {
    (async function onPostViewMount() {
      setOrder([]);
      await dispatch(fetchMeta(messageId));
      await fetchMore(true);
    })();
  }, [selected, ensName, messageId, modOverride?.unmoderated]);

  const gotoPost = useGoToPost();

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
    const observer = new window.ResizeObserver(() => {
      const rect = containerEl.current?.getBoundingClientRect();
      if (!rect) return;
      setHeight(window.innerHeight + rect.height - 80);
    });
    // @ts-ignore
    observer.observe(containerEl.current);
    cachedObserver = observer;
  }, [containerEl, messageId]);

  useEffect(() => {
    if (!parentEl.current || !scrollEl.current) return;
    const rect = parentEl.current.getBoundingClientRect();
    scrollEl.current.scrollTop = rect.height;
  }, [height, parentEl, scrollEl]);

  const onSuccessPost = useCallback(
    (post: PostMessage) => {
      const hash = post.hash();
      const messageId = post.creator ? post.creator + '/' + hash : hash;
      dispatch(setPost(post));
      if (post.payload.reference === reference) {
        setOrder([...order, messageId]);
      }
    },
    [order, reference]
  );

  return (
    <div className={classNames('flex-grow post-view', 'mx-4 py-2', {})} ref={scrollEl}>
      <div
        style={{
          height: height,
        }}>
        <div
          ref={containerEl}
          className={classNames('rounded-xl overflow-visible border post-view__container', {
            'border-gray-200': theme !== 'dark',
            'border-gray-800': theme === 'dark',
          })}>
          <div ref={parentEl}>
            <ParentThread
              className="rounded-xl"
              messageId={messageId}
              onSuccessPost={onSuccessPost}
            />
          </div>
          <Post className="rounded-xl" messageId={messageId} onSuccessPost={onSuccessPost} expand />
          {order.map(messageId => {
            return (
              <Thread
                key={messageId}
                className={classNames('transition-colors cursor-pointer border-t', {
                  'border-gray-200': theme !== 'dark',
                  'border-gray-800': theme === 'dark',
                })}
                postClassName={classNames('rounded-xl', {
                  'hover:bg-gray-50': theme !== 'dark',
                  'hover:bg-gray-800': theme === 'dark',
                })}
                messageId={messageId}
                clearObserver={clearObserver}
                onSuccessPost={onSuccessPost}
                onClick={e => {
                  e.stopPropagation();
                  gotoPost(messageId);
                }}
              />
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
    </div>
  );
}
