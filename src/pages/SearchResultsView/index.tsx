import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import InfiniteScrollable from '../../components/InfiniteScrollable';
import { useThemeContext } from '../../components/ThemeContext';
import { useLocation } from 'react-router';
import './search-view.scss';
import { searchPosts, useGoToPost } from '../../ducks/posts';
import { useDispatch } from 'react-redux';
import Post from '../../components/Post';

export default function SearchResultsView(): ReactElement {
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const theme = useThemeContext();
  const location = useLocation();
  const dispatch = useDispatch();
  const gotoPost = useGoToPost();

  const fetchMore = useCallback(
    async (reset = false) => {
      const params = new URLSearchParams(location.search);
      const query = params.get('q');
      if (!query) return;

      if (reset) {
        const messageIds: any = await dispatch(searchPosts(query, 20, 0));
        console.log({ messageIds });
        setOffset(20);
        setOrder(messageIds);
      } else {
        if (order.length % limit) return;
        const messageIds: any = await dispatch(searchPosts(query, limit, offset));
        setOffset(offset + limit);
        setOrder(order.concat(messageIds));
      }
    },
    [limit, offset, order]
  );

  useEffect(() => {
    fetchMore(true);
  }, []);

  return (
    <InfiniteScrollable
      className={classNames('search-view', 'border-l border-r', 'mx-4 py-2', {
        'border-gray-100': theme !== 'dark',
        'border-gray-800': theme === 'dark',
      })}
      bottomOffset={128}
      onScrolledToBottom={fetchMore}>
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
