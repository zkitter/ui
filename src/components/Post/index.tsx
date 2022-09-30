import '../../util/variable.scss';
import './post.scss';

import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { fetchMeta, fetchPost, unsetPost, usePost } from '../../ducks/posts';
import { removeMessage } from '../../ducks/drafts';
import { PostMessageSubType } from '../../util/message';

import { Props } from './types';
import ExpandedPost from './ExpandedPost';
import RegularPost from './RegularPost';
import LoadingPost from './LoadingPost';

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

// function getCommentDisabled(meta: PostMeta | null, identity: Identity | null, unmoderated = false): boolean {
//     if (unmoderated) return false;
//
//     if (meta?.rootId && identity?.type === 'gun') {
//         const {creator} = parseMessageId(meta.rootId);
//         if (creator === identity?.address) return false;
//     }
//
//     switch (meta?.moderation) {
//         case ModerationMessageSubType.ThreadBlock:
//             return !!meta.modblockedctx;
//         case ModerationMessageSubType.ThreadFollow:
//             return !meta.modfollowedctx;
//         case ModerationMessageSubType.ThreadMention:
//             return !meta.modmentionedctx;
//         default:
//             return false;
//     }
// }
