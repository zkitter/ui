import classNames from 'classnames';
import moment from 'moment/moment';
import React, { ReactElement, useCallback } from 'react';
import { useHistory } from 'react-router';

import { useMeta, usePost, useZKGroupFromPost } from '@ducks/posts';
import { useUser } from '@ducks/users';
import { MessageType, PostMessageSubType } from '~/message';
import { getHandle, getUsername } from '~/user';
import Avatar from '../Avatar';

import { convertMarkdownToDraft, DraftEditor } from '../DraftEditor';
import Icon from '../Icon';
import Nickname from '../Nickname';
import URLPreview from '../URLPreview';
import PostFooter from './PostFooter';
import PostMenu from './PostMenu';

import { Props } from './types';

export default function RegularPost(
  props: Props & {
    onDeletePost: () => void;
  }
): ReactElement {
  const { isParent } = props;
  const originalPost = usePost(props.messageId);
  const referencedPost = usePost(originalPost?.payload.reference);
  const messageId =
    originalPost?.subtype === PostMessageSubType.Repost
      ? originalPost.payload.reference
      : props.messageId;
  const post = originalPost?.subtype === PostMessageSubType.Repost ? referencedPost : originalPost;
  const user = useUser(post?.creator);
  const op = useUser(originalPost?.creator);
  const history = useHistory();
  const postJson = post?.toJSON();
  const meta = useMeta(postJson?.messageId);
  const zkGroup = useZKGroupFromPost(postJson?.messageId);

  const [parentCreator, parentHash] = post?.payload.reference.split('/') || [];
  const parentUser = useUser(parentCreator);

  const gotoUserProfile = useCallback(
    (e: any) => {
      if (!user || post?.type === MessageType._TWEET) return;
      e.stopPropagation();
      history.push(`/${user?.ens || user?.username}/`);
    },
    [user, post?.type]
  );

  if (!post) return <></>;

  let body = post.payload.content.slice(0, 512);
  body = post.payload.content.length > 512 ? body + '...' : body;

  const editorState = convertMarkdownToDraft(body);

  return (
    <div
      className={classNames('flex flex-col flex-nowrap', 'py-3 px-4', 'post', props.className)}
      onClick={e => {
        e.stopPropagation();
        props.onClick && props.onClick(e);
      }}>
      {originalPost?.subtype === PostMessageSubType.Repost ? (
        <div className="post__meta flex flex-row flex-nowrap ml-9 mb-2 items-center text-xs text-gray-500 font-bold ml-6">
          <Icon className="mr-2" fa="fas fa-retweet" size={0.75} />
          {getHandle(op)} Reposted
        </div>
      ) : null}
      <div className="flex flex-row flex-nowrap">
        <div>
          <Avatar
            className="mr-3 w-12 h-12"
            address={user?.username}
            incognito={post.creator === ''}
            group={zkGroup}
            twitterUsername={post.type === MessageType._TWEET ? post.creator : undefined}
          />
          {!!isParent && <div className="post__parent-line" />}
        </div>
        <div className="flex flex-col flex-nowrap items-start flex-grow flex-shrink w-0">
          <div className="flex flex-row flex-nowrap items-center text-light w-full">
            {post.type === MessageType._TWEET ? (
              <div
                className="post__creator-name text-base mr-1 flex flex-row items-center"
                onClick={() => window.open(`https://twitter.com/${post?.creator}`, '_blank')}>
                <span className="hover:underline font-bold">{post.creator}</span>
                <span className="ml-1 font-light text-light text-gray-500">from twitter.com</span>
              </div>
            ) : (
              <div
                className="post__creator-name font-bold text-base mr-1 hover:underline"
                onClick={gotoUserProfile}>
                <Nickname
                  address={user?.address}
                  group={zkGroup}
                  interepProvider={meta?.interepProvider}
                  interepGroup={meta?.interepGroup}
                />
              </div>
            )}

            {post.type !== MessageType._TWEET && (
              <div className="post__creator-username text-gray-400 mr-1" onClick={gotoUserProfile}>
                {getHandle(user)}
              </div>
            )}
            <div className="text-gray-400 mr-1">•</div>
            <div
              className="post__timestamp text-gray-400 hover:underline"
              onClick={gotoUserProfile}>
              {moment(post.createdAt).fromNow(true)}
            </div>
            <div className="flex flex-row flex-nowrap flex-grow flex-shrink justify-end">
              <PostMenu messageId={messageId} onDeletePost={props.onDeletePost} />
            </div>
          </div>
          <div
            className={classNames('text-light mt-1 mb-2 w-full relative', {
              'post__fade-out': post.payload.content.length > 512,
            })}>
            {!!parentCreator && post.type !== MessageType._TWEET && (
              <div className="flex flex-row flex-nowrap mb-2 items-center text-gray-500">
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

            {post.payload.content &&
              (meta.blocked ? (
                <div className="text-sm text-gray-600 bg-gray-100 border rounded px-2 py-1">
                  This post has been blocked.
                </div>
              ) : (
                <DraftEditor
                  editorState={editorState}
                  onChange={() => null}
                  customStyleMap={{
                    CODE: {
                      backgroundColor: '#f6f6f6',
                      color: '#1c1e21',
                      padding: '2px 4px',
                      margin: '0 2px',
                      borderRadius: '2px',
                      fontFamily: 'Roboto Mono, monospace',
                    },
                  }}
                  readOnly
                />
              ))}

            {post.payload.attachment && (
              <div className="post__attachment py-2">
                <URLPreview url={post.payload.attachment} />
              </div>
            )}
          </div>
          <PostFooter messageId={messageId} onSuccessPost={props.onSuccessPost} />
        </div>
      </div>
    </div>
  );
}
