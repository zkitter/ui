import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import Post from '@components/Post';
import { useDispatch } from 'react-redux';
import { fetchHomeFeed, setPost, useGoToPost } from '@ducks/posts';
import './home-feed.scss';
import Editor from '@components/Editor';
import { useLoggedIn } from '@ducks/web3';
import { Post as PostMessage } from '~/message';
import { submitPost, useDraft, useSubmitting } from '@ducks/drafts';
import InfiniteScrollable from '@components/InfiniteScrollable';
import LocalBackupNotification from '@components/LocalBackupNotification';
import { useSelectedLocalId } from '@ducks/worker';
import { useThemeContext } from '@components/ThemeContext';

export default function HomeFeed(): ReactElement {
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const dispatch = useDispatch();
  const selected = useSelectedLocalId();
  const theme = useThemeContext();

  useEffect(() => {
    (async function onGlobalFeedMount() {
      setFetching(true);
      try {
        await fetchMore(true);
      } finally {
        setFetching(false);
      }
    })();
  }, [selected]);

  const fetchMore = useCallback(
    async (reset = false) => {
      if (reset) {
        const messageIds: any = await dispatch(fetchHomeFeed(20, 0));
        setOffset(20);
        setOrder(messageIds);
      } else {
        if (order.length % limit) return;
        const messageIds: any = await dispatch(fetchHomeFeed(limit, offset));
        setOffset(offset + limit);
        setOrder(order.concat(messageIds));
      }
    },
    [limit, offset, order]
  );

  const onSuccessPost = useCallback(
    (post: PostMessage) => {
      const hash = post.hash();
      const messageId = post.creator ? post.creator + '/' + hash : hash;
      dispatch(setPost(post));
      setOrder([messageId, ...order]);
    },
    [order]
  );

  const gotoPost = useGoToPost();

  return (
    <InfiniteScrollable
      className={classNames('flex-grow home-feed', 'mx-4 py-2', {})}
      bottomOffset={128}
      onScrolledToBottom={fetchMore}>
      <LocalBackupNotification />
      <PostEditor onSuccessPost={onSuccessPost} />
      {!order.length && !fetching && (
        <div
          className={classNames(
            'flex flex-row flex-nowrap items-center justify-center',
            'py-6 px-4 border rounded-xl text-sm',
            {
              'border-gray-200 text-gray-300': theme !== 'dark',
              'border-gray-800 text-gray-700': theme === 'dark',
            }
          )}>
          Nothing to see here yet
        </div>
      )}
      {order.map((messageId, i) => {
        return (
          <Post
            key={messageId}
            // key={i}
            className={classNames('rounded-xl transition-colors mb-1 cursor-pointer border', {
              'hover:border-gray-300 border-gray-200': theme !== 'dark',
              'hover:border-gray-700 border-gray-800': theme === 'dark',
            })}
            messageId={messageId}
            onClick={() => gotoPost(messageId)}
          />
        );
      })}
    </InfiniteScrollable>
  );
}

function PostEditor(props: { onSuccessPost: (post: PostMessage) => void }): ReactElement {
  const dispatch = useDispatch();
  const loggedIn = useLoggedIn();
  const submitting = useSubmitting();
  const draft = useDraft();
  const theme = useThemeContext();

  const onPost = useCallback(async () => {
    const post: any = await dispatch(submitPost());

    if (post) {
      props.onSuccessPost(post);
    }
  }, [draft]);

  return (
    <Editor
      messageId=""
      className={classNames('mb-1 transition-shadow border mobile-hidden', {
        'focus-within:border-gray-300 border-gray-200': loggedIn && theme !== 'dark',
        'focus-within:border-gray-700 border-gray-800': loggedIn && theme === 'dark',
      })}
      editorState={draft.editorState}
      onPost={onPost}
      loading={submitting}
    />
  );
}
