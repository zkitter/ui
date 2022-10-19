import classNames from 'classnames';
import React, { ReactElement, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  MessageType,
  ModerationMessageSubType,
  Post as PostMessage,
  PostMessageSubType,
} from '../../util/message';
import {
  decrementLike,
  decrementRepost,
  incrementLike,
  incrementReply,
  incrementRepost,
  setLiked,
  setReposted,
  useCommentDisabled,
  useMeta,
  usePost,
} from '../../ducks/posts';
import { useCanNonPostMessage, useLoggedIn } from '../../ducks/web3';
import { useSelectedLocalId } from '../../ducks/worker';
import { usePostModeration } from '../../ducks/mods';
import { useThemeContext } from '../ThemeContext';
import {
  removeMessage,
  submitModeration,
  submitPost,
  submitRepost,
  useDraft,
  useSubmitting,
} from '../../ducks/drafts';
import { useUser } from '../../ducks/users';
import { getHandle } from '../../util/user';

import Editor from '../Editor';
import Modal, { ModalContent, ModalHeader } from '../Modal';
import PostButton from './PostButton';

type ReplyEditorModalProps = {
  onClose: () => void;
  messageId: string;
  onSuccessPost?: (post: PostMessage) => void;
};

function ReplyEditorModal(props: ReplyEditorModalProps): ReactElement {
  const { messageId, onClose } = props;
  const dispatch = useDispatch();
  const post = usePost(props.messageId);
  const draft = useDraft(props.messageId);
  const submitting = useSubmitting();
  const user = useUser(post?.creator);

  const submitReply = useCallback(async () => {
    const post: any = await dispatch(submitPost(messageId));

    if (post && props.onSuccessPost) {
      props.onSuccessPost(post);
    }

    dispatch(incrementReply(props.messageId));
    onClose();
  }, [messageId, draft.editorState]);

  return (
    <Modal className="w-144 reply-modal" onClose={props.onClose}>
      <ModalHeader onClose={props.onClose}>
        <b>{`Replying to ${!post?.creator ? 'Anonymous' : '@' + getHandle(user)}`}</b>
      </ModalHeader>
      <ModalContent className="min-h-64">
        <Editor
          messageId={messageId}
          className="reply-editor"
          editorState={draft.editorState}
          onPost={submitReply}
          loading={submitting}
        />
      </ModalContent>
    </Modal>
  );
}

function getCommentIconFA(moderation?: ModerationMessageSubType | null): string {
  switch (moderation) {
    case ModerationMessageSubType.ThreadBlock:
      return 'fas fa-shield-alt';
    case ModerationMessageSubType.ThreadFollow:
      return 'fas fa-user-check';
    case ModerationMessageSubType.ThreadMention:
      return 'fas fa-at';
    default:
      return 'far fa-comments';
  }
}

export default function PostFooter(props: {
  className?: string;
  messageId: string;
  large?: boolean;
  onSuccessPost?: (post: PostMessage) => void;
}): ReactElement {
  const { large, className, messageId } = props;
  const meta = useMeta(messageId);
  const post = usePost(messageId);
  const loggedIn = useLoggedIn();
  const selected = useSelectedLocalId();
  const canNonPostMessage = useCanNonPostMessage();
  const dispatch = useDispatch();
  const [showReply, setShowReply] = useState(false);
  const modOverride = usePostModeration(meta?.rootId);
  const commentDisabled = useCommentDisabled(meta?.rootId);
  const theme = useThemeContext();

  const onLike = useCallback(async () => {
    const mod: any = await dispatch(submitModeration(messageId, ModerationMessageSubType.Like));
    const { messageId: mid } = await mod.toJSON();
    dispatch(incrementLike(messageId));
    dispatch(setLiked(messageId, mid));
  }, [messageId]);

  const onUnike = useCallback(() => {
    if (!meta?.liked) return;
    dispatch(removeMessage(meta?.liked));
    dispatch(decrementLike(messageId));
    dispatch(setLiked(messageId, null));
  }, [meta?.liked]);

  const onRepost = useCallback(async () => {
    const post: any = await dispatch(submitRepost(messageId));
    const { messageId: mid } = await post.toJSON();
    dispatch(incrementRepost(messageId));
    dispatch(setReposted(messageId, mid));
  }, [messageId]);

  const onUnrepost = useCallback(() => {
    if (!meta?.reposted) return;
    dispatch(removeMessage(meta?.reposted));
    dispatch(decrementRepost(messageId));
    dispatch(setReposted(messageId, null));
  }, [meta?.reposted]);

  const isMirrorTweet = [PostMessageSubType.MirrorPost, PostMessageSubType.MirrorReply].includes(
    // @ts-ignore
    post?.subtype
  );
  const isTweet = post?.type === MessageType._TWEET;

  return (
    <div
      className={classNames(
        'flex flex-row flex-nowrap items-center w-full',
        'post__footer',
        className
      )}>
      {showReply && (
        <ReplyEditorModal
          onClose={() => setShowReply(false)}
          onSuccessPost={props.onSuccessPost}
          messageId={messageId}
        />
      )}
      <PostButton
        iconClassName={classNames('', {
          'hover:bg-blue-50 hover:text-blue-400': theme !== 'dark',
          'hover:bg-blue-900 hover:text-blue-600': theme === 'dark',
        })}
        fa={getCommentIconFA(meta?.moderation)}
        disabled={(!modOverride?.unmoderated && commentDisabled) || isTweet}
        count={meta.replyCount}
        onClick={() => setShowReply(true)}
        large={large}
      />
      <PostButton
        textClassName={classNames({
          'text-green-400': meta.reposted,
        })}
        iconClassName={classNames({
          'text-green-400': meta.reposted,
          'hover:bg-green-50 hover:text-green-400': loggedIn && theme !== 'dark',
          'hover:bg-green-900 hover:text-green-600': loggedIn && theme === 'dark',
        })}
        fa="fas fa-retweet"
        count={meta.repostCount}
        onClick={meta.reposted ? onUnrepost : onRepost}
        disabled={!canNonPostMessage || isTweet}
        large={large}
      />
      <PostButton
        textClassName={classNames({
          'text-red-400': meta.liked,
        })}
        iconClassName={classNames({
          'text-red-400': meta.liked,
          'hover:bg-red-50 hover:text-red-400': loggedIn && theme !== 'dark',
          'hover:bg-red-900 hover:text-red-600': loggedIn && theme === 'dark',
        })}
        fa={classNames({
          'far fa-heart': !meta.liked,
          'fas fa-heart': meta.liked,
        })}
        count={meta.likeCount}
        onClick={meta.liked ? onUnike : onLike}
        disabled={!canNonPostMessage || isTweet}
        large={large}
      />
      {isMirrorTweet && (
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
          large={large}
        />
      )}
      <div className="flex flex-grow flex-row flex-nowrap justify-end items-center"></div>
    </div>
  );
}
