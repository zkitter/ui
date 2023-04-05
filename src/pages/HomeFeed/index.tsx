import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import Post from '@components/Post';
import { useDispatch } from 'react-redux';
import { setPost, useGoToPost } from '@ducks/posts';
import './home-feed.scss';
import Editor from '@components/Editor';
import { useLoggedIn } from '@ducks/web3';
import { Filter, Post as PostMessage } from 'zkitter-js';
import { submitPost, useDraft, useSubmitting } from '@ducks/drafts';
import InfiniteScrollable from '@components/InfiniteScrollable';
import LocalBackupNotification from '@components/LocalBackupNotification';
import { useSelectedLocalId } from '@ducks/worker';
import { useThemeContext } from '@components/ThemeContext';
import { useZkitter, useZkitterSync } from '@ducks/zkitter';
import Icon from '@components/Icon';
import SpinnerGif from '#/icons/spinner.gif';

export default function HomeFeed(): ReactElement {
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState('');
  const [order, setOrder] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const dispatch = useDispatch();
  const selected = useSelectedLocalId();
  const theme = useThemeContext();
  const zkitter = useZkitter();
  const {
    arbitrum: { toBlock, fromBlock, latest },
  } = useZkitterSync();
  const [filters, setFilters] = useState<Filter>(new Filter());

  const completion = (fromBlock / latest) * 100;

  useEffect(() => {
    (async function onGlobalFeedMount() {
      setFetching(true);
      try {
        await fetchMore(true);
      } finally {
        setFetching(false);
      }
    })();
  }, [selected, zkitter, filters]);

  useEffect(() => {
    (async function onUpdateFollowings() {
      if (zkitter && selected?.type === 'gun') {
        const data = await zkitter?.getFollowings(selected.address);
        setFilters(new Filter({ address: data.concat(selected.address) }));
      }
    })();
  }, [selected, zkitter]);

  const fetchMore = useCallback(
    async (reset = false) => {
      if (!zkitter) return;

      if (reset) {
        const posts = await zkitter.getHomefeed(filters, 20);
        if (!posts.length) return;
        const messageIds = posts.map(post => post.toJSON().messageId);
        const last = posts[posts.length - 1];
        setOffset(last.hash());
        setOrder(messageIds);
      } else {
        const posts = await zkitter.getHomefeed(filters, limit, offset);
        if (!posts.length) return;
        const messageIds = posts.map(post => post.toJSON().messageId);
        const last = posts[posts.length - 1];
        setOffset(last.hash());
        setOrder(order.concat(messageIds));
      }
    },
    [zkitter, limit, offset, order, filters]
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
      {!zkitter && (
        <div
          className={classNames(
            'flex flex-col flex-nowrap items-center justify-center',
            'py-6 px-4 border rounded-xl text-sm',
            {
              'border-gray-200 text-gray-300': theme !== 'dark',
              'border-gray-800 text-gray-700': theme === 'dark',
            }
          )}>
          <Icon url={SpinnerGif} size={4} />
          <div>
            {completion < 99
              ? `Syncing with Arbitrum (${completion.toFixed(2)}%)...`
              : `Syncing messages...`}
          </div>
        </div>
      )}
      {!order.length && !fetching && !!zkitter && (
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
