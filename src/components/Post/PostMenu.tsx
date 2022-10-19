import copy from 'copy-to-clipboard';
import classNames from 'classnames';
import React, { ReactElement, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

import { setBlockedPost, useMeta, usePost } from '../../ducks/posts';
import { setBlocked, useUser } from '../../ducks/users';
import { useSelectedLocalId, useWorkerUnlocked } from '../../ducks/worker';
import { useThemeContext } from '../ThemeContext';
import { removeMessage, submitConnection, submitModeration } from '../../ducks/drafts';
import {
  ConnectionMessageSubType,
  MessageType,
  ModerationMessageSubType,
  PostMessageSubType,
} from '../../util/message';
import { getName } from '../../util/user';

import Icon from '../Icon';
import Menuable from '../Menuable';
import PostButton from './PostButton';
import { Props } from './types';

export default function PostMenu(
  props: Props & {
    onDeletePost: () => void;
  }
): ReactElement {
  const post = usePost(props.messageId);
  const meta = useMeta(props.messageId);
  const user = useUser(post?.creator);
  const dispatch = useDispatch();
  const unlocked = useWorkerUnlocked();
  const selected = useSelectedLocalId();
  const isCurrentUser = selected?.type === 'gun' ? user?.username === selected.address : false;
  const [opened, setOpened] = useState(false);
  const theme = useThemeContext();

  const onBlock = useCallback(() => {
    if (!user) return;
    dispatch(submitConnection(user?.username, ConnectionMessageSubType.Block));
    setOpened(false);
  }, [user]);

  const onUnblock = useCallback(() => {
    if (user?.meta?.blocked) {
      dispatch(removeMessage(user?.meta?.blocked));
      dispatch(setBlocked(user?.username, null));
      setOpened(false);
    }
  }, [user?.meta?.blocked]);

  const onBlockPost = useCallback(() => {
    if (!props.messageId) return;
    dispatch(submitModeration(props.messageId, ModerationMessageSubType.Block));
    setOpened(false);
  }, [props.messageId]);

  const onUnblockPost = useCallback(() => {
    if (!meta?.blocked) return;
    dispatch(removeMessage(meta.blocked));
    dispatch(setBlockedPost(props.messageId, null));
    setOpened(false);
  }, [meta?.blocked, props.messageId]);

  if (post?.type === MessageType._TWEET) {
    return (
      <PostButton
        iconClassName="hover:bg-blue-50 text-blue-400"
        fa="fab fa-twitter"
        onClick={() => {
          if (!post) return;

          if (
            [PostMessageSubType.MirrorPost, PostMessageSubType.MirrorReply].includes(post.subtype)
          ) {
            window.open(post.payload.topic, '_blank');
          } else if (post.type === MessageType._TWEET) {
            window.open(`https://twitter.com/${post.creator}/status/${post.tweetId}`, '_blank');
          }
        }}
      />
    );
  }

  const postMenuItems = [];

  if (post?.payload.attachment) {
    try {
      const url = new URL(post?.payload.attachment);
      const hosts = url.host.split('.');

      if (hosts.slice(-3).join('.') === 'ipfs.dweb.link' && hosts.length === 4) {
        postMenuItems.push({
          label: `Copy IPFS CID`,
          iconFA: 'fas fa-copy',
          onClick: () => copy(hosts[0]),
          iconClassName: 'text-gray-400',
        });
      }

      if (url.protocol === 'magnet:') {
        postMenuItems.push({
          label: `Copy Magnet Link`,
          iconFA: 'fas fa-copy',
          onClick: () => copy(post?.payload.attachment),
          iconClassName: 'text-gray-400',
        });
      } else {
        postMenuItems.push({
          label: `Copy Link`,
          iconFA: 'fas fa-copy',
          onClick: () => copy(post?.payload.attachment),
          iconClassName: 'text-gray-400',
        });
      }
    } catch (e) {}
  }

  if (!isCurrentUser) {
    if (user) {
      postMenuItems.push(
        user?.meta?.blocked
          ? {
              label: `Unblock @${getName(user)}`,
              iconFA: 'fas fa-user-slash',
              onClick: onUnblock,
              disabled: !unlocked,
              iconClassName: 'text-gray-400',
            }
          : {
              label: `Block @${getName(user)}`,
              iconFA: 'fas fa-user-slash',
              onClick: onBlock,
              disabled: !!user?.meta?.followed || !unlocked,
              className: 'block-user-item',
              iconClassName: 'text-red-400 hover:text-red-800',
            }
      );
    }

    if (meta?.blocked) {
      postMenuItems.push({
        label: `Unblock Post`,
        iconFA: 'fas fa-ban',
        disabled: !unlocked,
        onClick: onUnblockPost,
        iconClassName: 'text-gray-400',
      });
    } else {
      postMenuItems.push({
        label: `Block Post`,
        iconFA: 'fas fa-ban',
        className: 'block-user-item',
        disabled: !unlocked,
        onClick: onBlockPost,
        iconClassName: 'text-red-400 hover:text-red-800',
      });
    }
  } else if (isCurrentUser) {
    postMenuItems.push({
      label: `Delete Post`,
      iconFA: 'fas fa-trash',
      className: 'block-user-item',
      disabled: !unlocked,
      onClick: props.onDeletePost,
      iconClassName: 'text-red-400 hover:text-red-800',
    });
  }

  return (
    <Menuable
      className="post__menu"
      items={postMenuItems}
      opened={opened}
      onClose={() => setOpened(false)}
      onOpen={() => setOpened(true)}>
      <Icon
        className={classNames({
          'text-gray-400 hover:text-gray-800': theme !== 'dark',
          'text-gray-600 hover:text-gray-200': theme === 'dark',
        })}
        fa="fas fa-ellipsis-h"
      />
    </Menuable>
  );
}
