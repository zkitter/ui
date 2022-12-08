import '~/variable.scss';
import './post.scss';

import React, { MouseEventHandler, ReactElement, useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { removeMessage } from '@ducks/drafts';
import { fetchMeta, fetchPost, unsetPost, usePost } from '@ducks/posts';
import { Post as PostMessage, PostMessageSubType } from '~/message';

import ExpandedPost from './ExpandedPost';
import LoadingPost from './LoadingPost';
import RegularPost from './RegularPost';

type Props = {
  messageId: string;
  className?: string;
  onClick?: MouseEventHandler;
  expand?: boolean;
  isParent?: boolean;
  onSuccessPost?: (post: PostMessage) => void;
};

export default function Post(props: Props): ReactElement {
  const { expand } = props;
  const originalPost = usePost(props.messageId);
  const referencedPost = usePost(originalPost?.payload.reference);
  const messageId =
    originalPost?.subtype === PostMessageSubType.Repost
      ? originalPost.payload.reference
      : props.messageId;
  const post = originalPost?.subtype === PostMessageSubType.Repost ? referencedPost : originalPost;
  const dispatch = useDispatch();
  const [deleted, setDeleted] = useState(false);

  const onDeletePost = useCallback(() => {
    if (!props.messageId) return;
    dispatch(removeMessage(props.messageId));
    dispatch(unsetPost(props.messageId));
    setDeleted(true);
  }, [props.messageId]);

  useEffect(() => {
    if (!post) {
      dispatch(fetchPost(messageId));
      dispatch(fetchMeta(messageId));
    }
  }, [messageId, post]);

  if (!post) return <LoadingPost {...props} />;

  if (deleted) return <></>;

  return (
    <>
      {!expand && <RegularPost key={props.messageId} onDeletePost={onDeletePost} {...props} />}
      {!!expand && <ExpandedPost key={props.messageId} onDeletePost={onDeletePost} {...props} />}
    </>
  );
}
