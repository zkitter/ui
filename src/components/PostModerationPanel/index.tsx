import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';
import { useUser } from '@ducks/users';
import Icon from '../Icon';
import SpinnerGIF from '#/icons/spinner.gif';
import { useHistory, useParams } from 'react-router';
import { getHandle, getUsername } from '~/user';
import './post-mod-panel.scss';
import { useMeta, usePost } from '@ducks/posts';
import { ModerationMessageSubType, PostMessageSubType } from '~/message';
import SwitchButton from '../SwitchButton';
import { unmoderate, usePostModeration } from '@ducks/mods';
import { useThemeContext } from '../ThemeContext';

export default function PostModerationPanel(): ReactElement {
  const [loading, setLoading] = useState(false);
  const { name, hash } = useParams<{ name?: string; hash: string }>();
  const dispatch = useDispatch();
  const messageId = [name, hash].join('/');
  const originPost = usePost(messageId);
  const meta = useMeta(
    originPost?.subtype === PostMessageSubType.Repost ? originPost.payload.reference : messageId
  );
  const threadmod = usePostModeration(meta?.rootId);
  const [unmoderated, setUnmoderated] = useState(false);
  const theme = useThemeContext();

  useEffect(() => {
    (async function onPostModerationPanelMount() {
      setUnmoderated(!!threadmod?.unmoderated);
    })();
  }, [threadmod]);

  const toggleModeration = useCallback(() => {
    if (!meta?.rootId) return;
    dispatch(unmoderate(meta?.rootId, !unmoderated));
    setUnmoderated(!unmoderated);
  }, [unmoderated, meta?.rootId]);

  return (
    <div
      className={classNames(
        'flex flex-col flex-nowrap flex-grow border rounded-xl mt-2',
        'meta-group post-mod-panel',
        {
          'border-gray-200': theme !== 'dark',
          'border-gray-800': theme === 'dark',
        }
      )}>
      <div
        className={classNames('px-4 py-2 font-bold text-lg border-b', {
          'border-gray-200': theme !== 'dark',
          'border-gray-800': theme === 'dark',
        })}>
        Moderation
      </div>
      <div className="flex flex-col flex-nowrap py-1">
        {loading && <Icon className="self-center my-4" url={SpinnerGIF} size={3} />}
        <div className="flex flex-row items-center justify-center px-4 py-2">
          <Icon
            className={classNames(
              'flex flex-row items-center justify-center flex-shrink-0 flex-grow-0',
              'h-9 w-9 p-2 rounded-full border-2',
              {
                'border-black text-black': theme !== 'dark',
                'border-white text-white': theme === 'dark',
              }
            )}
            fa={getFA(meta?.moderation)}
            size={0.875}
          />
          <div className="flex-grow flex-shrink w-0 text-light ml-2">
            <PanelTextContent />
          </div>
        </div>
      </div>
      {meta?.moderation && (
        <div
          className={classNames('flex flex-row items-center text-sm', 'px-4 py-2', {
            'bg-gray-100 text-gray-500': theme !== 'dark',
            'bg-gray-900 text-gray-500': theme === 'dark',
          })}>
          <div className="flex-grow flex-shrink w-0 mr-2">
            You can switch off moderation for this post temporarily
          </div>
          <SwitchButton
            className="flex-grow-0 flex-shrink-0 ml-4"
            checked={!unmoderated}
            onChange={toggleModeration}
          />
        </div>
      )}
    </div>
  );
}

function getFA(moderation?: ModerationMessageSubType | null): string {
  switch (moderation) {
    case ModerationMessageSubType.ThreadBlock:
      return 'fas fa-shield-alt';
    case ModerationMessageSubType.ThreadFollow:
      return 'fas fa-user-check';
    case ModerationMessageSubType.ThreadMention:
      return 'fas fa-at';
    default:
      return 'fas fa-globe';
  }
}

function PanelTextContent(): ReactElement {
  const { name, hash } = useParams<{ name?: string; hash: string }>();
  const messageId = [name, hash].join('/');
  const originPost = usePost(messageId);
  const meta = useMeta(
    originPost?.subtype === PostMessageSubType.Repost ? originPost.payload.reference : messageId
  );
  const root = usePost(meta?.rootId || undefined);
  const op = useUser(root?.creator);
  const history = useHistory();

  const handle = getHandle(op);
  const mention = (
    <a
      className="hashtag cursor-pointer ml-1"
      onClick={e => {
        e.stopPropagation();
        history.push(`/${encodeURIComponent(getUsername(op))}/`);
      }}>
      @{handle}
    </a>
  );

  switch (meta?.moderation) {
    case ModerationMessageSubType.ThreadBlock:
      return (
        <div>
          Hide replies blocked by
          {mention}
        </div>
      );
    case ModerationMessageSubType.ThreadFollow:
      return (
        <div>
          Show only replies liked or followed
          {mention}
        </div>
      );
    case ModerationMessageSubType.ThreadMention:
      return (
        <div>
          Show only replies from users mentioned by
          {mention}
        </div>
      );
    default:
      return <div>Show all contents</div>;
  }
}
