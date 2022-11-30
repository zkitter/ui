import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useSelectedLocalId } from '../../ducks/worker';
import config from '../../util/config';
import { useHistory } from 'react-router';
import { parseMessageId, PostMessageSubType } from '../../util/message';
import { zkchat } from '../../ducks/chats';
import { getUser, useUser } from '../../ducks/users';
import { useThemeContext } from '../../components/ThemeContext';
import { useDispatch } from 'react-redux';
import './notification.scss';
import Avatar from '../../components/Avatar';
import { getName } from '../../util/user';
import Icon from '../../components/Icon';
import Post from '../../components/Post';
import {
  fetchMeta,
  fetchNotifications,
  fetchPost,
  fetchPosts,
  useGoToPost,
  usePost,
  usePostContent,
} from '../../ducks/posts';
import InfiniteScrollable from '../../components/InfiniteScrollable';
import { updateLastReadTimestamp } from '../../ducks/app';

export default function NotificationView(): ReactElement {
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const selected = useSelectedLocalId();
  const selectedUser = useUser(selected?.address);
  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState([]);
  const theme = useThemeContext();

  const fetchMore = useCallback(
    async (reset = false) => {
      if (!selected?.address) return;

      if (reset) {
        const payload: any = await dispatch(fetchNotifications(selected.address, 20, 0));
        setOffset(20);
        setNotifications(payload);
      } else {
        if (notifications.length % limit) return;
        const payload: any = await dispatch(fetchNotifications(selected.address, limit, offset));
        setOffset(offset + limit);
        setNotifications(notifications.concat(payload));
      }
    },
    [limit, offset, selected?.address, notifications]
  );

  useEffect(() => {
    (async function () {
      if (selected?.type === 'gun') {
        fetchMore();
        dispatch(updateLastReadTimestamp());
      }
    })();
  }, [selected]);

  useEffect(() => {
    if (selected?.address && !selectedUser?.ecdh) {
      dispatch(getUser(selected.address));
    }
  }, [selectedUser?.ecdh, selected?.address]);

  return (
    <InfiniteScrollable
      className={classNames('notifications', 'border-l border-r', 'mx-4 py-2', {
        'border-gray-100': theme !== 'dark',
        'border-gray-800': theme === 'dark',
      })}
      bottomOffset={128}
      onScrolledToBottom={fetchMore}>
      {notifications.map((data: any) => {
        const { message_id, timestamp, type, sender_pubkey } = data;
        const { creator, hash } = parseMessageId(message_id);

        switch (type) {
          case 'DIRECT':
            return null;
          // case 'DIRECT':
          //     return (
          //         <IncomingChatRow
          //             sender_pubkey={sender_pubkey}
          //             creator={data.creator}
          //         />
          //     )
          case 'LIKE':
          case 'REPOST':
            return <IncomingReactionRow type={type} messageId={message_id} />;
          case 'MEMBER_INVITE':
          case 'MEMBER_ACCEPT':
            return <IncomingReactionRow type={type} messageId={message_id} />;
          case 'REPLY':
            return <IncomingReplyRow messageId={message_id} />;
          default:
            return <div>{type}</div>;
        }
      })}
    </InfiniteScrollable>
  );
}

function IncomingChatRow(props: { sender_pubkey: string; creator: string }): ReactElement {
  const selected = useSelectedLocalId();
  const selectedUser = useUser(selected?.address);
  const creator = useUser(props.creator);
  const theme = useThemeContext();
  const history = useHistory();

  const chatId =
    selectedUser &&
    zkchat.deriveChatId({
      type: 'DIRECT',
      receiver: selectedUser.address,
      receiverECDH: selectedUser.ecdh,
      senderECDH: props.sender_pubkey,
    });

  return (
    <div
      className="flex flex-row cursor-pointer notification-row px-4 py-2"
      onClick={() => history.push(`/chat/${chatId}`)}>
      <div className="flex flex-row items-center">
        <Avatar className="w-8 h-8" address={props.creator} incognito={!props.creator} />
        <div className="ml-2 text-sm">
          <span className="font-semibold">{props.creator ? getName(creator) : 'Someone'}</span>
          <span className="ml-2">sent you a message</span>
        </div>
      </div>
    </div>
  );
}

function IncomingReactionRow(props: {
  messageId: string;
  type: 'LIKE' | 'REPOST' | 'MEMBER_INVITE' | 'MEMBER_ACCEPT';
}): ReactElement {
  const { creator, hash } = parseMessageId(props.messageId);
  const user = useUser(creator);
  const history = useHistory();
  const originalPost = usePost(props.messageId);
  const referencedPost = usePost(originalPost?.payload.reference);
  const messageId =
    originalPost?.subtype === PostMessageSubType.Repost
      ? originalPost.payload.reference
      : props.messageId;
  const post = originalPost?.subtype === PostMessageSubType.Repost ? referencedPost : originalPost;
  const dispatch = useDispatch();
  const content = usePostContent(messageId);

  const goto = useCallback(() => {
    if (props.type === 'MEMBER_INVITE' || props.type === 'MEMBER_ACCEPT') {
      history.push(`/${creator}`);
    } else {
      history.push(`/${creator}/status/${hash}`);
    }
  }, [creator, hash]);

  useEffect(() => {
    if (!post) {
      dispatch(fetchPost(messageId));
      dispatch(fetchMeta(messageId));
    }
  }, [messageId, post]);

  return (
    <div className="flex flex-row cursor-pointer notification-row px-4 py-3" onClick={goto}>
      <Icon
        className="flex flex-row mr-4 notification-row__icon"
        fa={classNames({
          'fas fa-heart text-red-500 ': props.type === 'LIKE',
          'fas fa-retweet text-green-500': props.type === 'REPOST',
          'fas fa-user-plus text-blue-500': props.type === 'MEMBER_INVITE',
          'fas fa-user-check text-blue-500': props.type === 'MEMBER_ACCEPT',
        })}
        size={props.type === 'MEMBER_INVITE' || props.type === 'MEMBER_ACCEPT' ? 1.6125 : 2}
      />
      <div className="flex flex-col items-start">
        <Avatar className="w-8 h-8" address={creator} incognito={!creator} />
        {props.type === 'MEMBER_INVITE' && (
          <div className="mt-2 text-sm">
            <span className="mr-1">You received an invitation to join</span>
            <span className="font-semibold">{getName(user)}</span>
          </div>
        )}
        {props.type === 'MEMBER_ACCEPT' && (
          <div className="mt-2 text-sm">
            <span className="font-semibold">{getName(user)}</span>
            <span className="ml-1">accepted your invitation</span>
          </div>
        )}
        {props.type === 'LIKE' && (
          <div className="mt-2 text-sm">
            <span className="font-semibold">{creator ? getName(user) : 'Someone'}</span>
            <span className="ml-1">liked your post</span>
          </div>
        )}
        {props.type === 'REPOST' && (
          <div className="mt-2 text-sm">
            <span className="font-semibold">{creator ? getName(user) : 'Someone'}</span>
            <span className="ml-1">shared your post</span>
          </div>
        )}
        <div className="text-sm text-gray-500 mt-2">{content}</div>
      </div>
    </div>
  );
}

function IncomingReplyRow(props: { messageId: string }): ReactElement {
  const gotoPost = useGoToPost();

  return (
    <Post
      className="notification-row cursor-pointer"
      messageId={props.messageId}
      onClick={() => gotoPost(props.messageId)}
    />
  );
}
