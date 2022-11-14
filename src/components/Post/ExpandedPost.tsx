import classNames from 'classnames';
import moment from 'moment/moment';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router';

import { fetchLikersByPost, useMeta, usePost, useZKGroupFromPost } from '@ducks/posts';
import { useUser } from '@ducks/users';
import { PostMessageSubType } from '~/message';
import { getHandle, getUsername } from '~/user';
import Avatar from '../Avatar';
import { convertMarkdownToDraft, DraftEditor } from '../DraftEditor';

import Nickname from '../Nickname';
import { useThemeContext } from '../ThemeContext';
import URLPreview from '../URLPreview';
import UsersCountModal, { Item } from '../UsersCountModal';
import PostFooter from './PostFooter';
import PostMenu from './PostMenu';
import { Props } from './types';

export default function ExpandedPost(
  props: Props & {
    onDeletePost: () => void;
  }
): ReactElement {
  const originalPost = usePost(props.messageId);
  const referencedPost = usePost(originalPost?.payload.reference);
  const messageId =
    originalPost?.subtype === PostMessageSubType.Repost
      ? originalPost.payload.reference
      : props.messageId;
  const post = originalPost?.subtype === PostMessageSubType.Repost ? referencedPost : originalPost;
  const user = useUser(post?.creator);
  const history = useHistory();
  const [parentCreator, parentHash] = post?.payload.reference.split('/') || [];
  const parentUser = useUser(parentCreator);
  const meta = useMeta(props.messageId);
  const zkGroup = useZKGroupFromPost(props.messageId);
  const theme = useThemeContext();

  const gotoUserProfile = useCallback(
    (e: any) => {
      if (!user || !post?.creator) return;
      e.stopPropagation();
      history.push(`/${user?.ens || user?.username}/`);
    },
    [user, post]
  );

  if (!post) return <></>;

  const editorState = convertMarkdownToDraft(post.payload.content);

  return (
    <div
      className={classNames('flex flex-col flex-nowrap', 'py-3 px-4', 'post', props.className)}
      onClick={props.onClick}>
      <div className="flex flex-row flex-nowrap flex-grow-0 flex-shrink-0">
        <Avatar
          className="mr-3 w-12 h-12"
          address={user?.address}
          incognito={post.creator === ''}
          group={zkGroup}
        />
        <div className="flex flex-col flex-nowrap items-start text-light w-full cursor-pointer">
          <div className="font-bold text-base mr-1 hover:underline" onClick={gotoUserProfile}>
            <Nickname address={user?.address} group={zkGroup} />
          </div>
          <div className="text-gray-400 mr-1" onClick={gotoUserProfile}>
            {getHandle(user)}
          </div>
        </div>
        <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
          <PostMenu messageId={messageId} onDeletePost={props.onDeletePost} />
        </div>
      </div>
      <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink">
        {!!parentCreator && (
          <div className="flex flex-row flex-nowrap mt-2 items-center text-gray-500">
            {parentHash ? (
              <span>
                Replying to
                <span
                  className="cursor-pointer hover:underline text-primary-color ml-1"
                  onClick={e => {
                    e.stopPropagation();
                    history.push(`/${getUsername(parentUser)}/`);
                  }}>
                  {`@${getHandle(parentUser)}`}
                </span>
              </span>
            ) : (
              'Replying to an anonymous user'
            )}
          </div>
        )}
        <div className="mt-4 mb-2 text-xl w-full">
          {post.payload.content &&
            (meta.blocked ? (
              <div className="text-sm text-gray-600 bg-gray-100 border rounded px-2 py-1">
                This post has been blocked.
              </div>
            ) : (
              <DraftEditor editorState={editorState} onChange={() => null} readOnly />
            ))}
          {post.payload.attachment && (
            <div className="post__attachment py-2">
              <URLPreview url={post.payload.attachment} showAll />
            </div>
          )}
        </div>
        <div className="flex flex-row flex-nowrap items-center text-light w-full">
          <div className="text-gray-500 my-2">{moment(post.createdAt).format('lll')}</div>
        </div>

        <div className="flex flex-row flex-no-wrap item-center text-light w-full">
          <UsersCountModal
            className={classNames('mt-2 pt-3 mx-2 w-full', {
              'border-gray-200': theme !== 'dark',
              'border-gray-800': theme === 'dark',
            })}
            item={Item.Like}
            id={messageId}
          />

          <UsersCountModal
            className={classNames('mt-2 pt-3 w-full', {
              'border-gray-200': theme !== 'dark',
              'border-gray-800': theme === 'dark',
            })}
            item={Item.Retweet}
            id={messageId}
          />
        </div>

        <PostFooter
          messageId={messageId}
          className={classNames('mt-2 pt-3 border-t w-full cursor-pointer', {
            'border-gray-200': theme !== 'dark',
            'border-gray-800': theme === 'dark',
          })}
          onSuccessPost={props.onSuccessPost}
          large
        />
      </div>
    </div>
  );
}
