import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { DraftHandleValue, EditorState, RichUtils } from 'draft-js';
import classNames from 'classnames';
import './editor.scss';
import { useAccount, useCanNonPostMessage, useGunKey } from '@ducks/web3';
import Avatar from '../Avatar';
import Web3Button from '../Web3Button';
import Button from '../Button';
import { DraftEditor } from '../DraftEditor';
import Icon from '../Icon';
import { setDraft, setGloabl, setMirror, setModeration, useDraft, useMirror } from '@ducks/drafts';
import { useDispatch } from 'react-redux';
import URLPreview from '../URLPreview';
import SpinnerGif from '#/icons/spinner.gif';
import { useUser } from '@ducks/users';
import {
  setPostingGroup,
  usePostingGroup,
  useSelectedLocalId,
  useSelectedZKGroup,
} from '@ducks/worker';
import { useHistory } from 'react-router';
import Checkbox from '../Checkbox';
import { getSession, verifyTweet } from '~/twitter';
import ModerationButton from '../ModerationButton';
import { ModerationMessageSubType } from 'zkitter-js';
import { usePostModeration } from '@ducks/mods';
import { useCommentDisabled, useMeta } from '@ducks/posts';
import Menuable from '../Menuable';
import FileUploadModal from '../FileUploadModal';
import LinkInputModal from '../LinkInputModal';
import { useThemeContext } from '../ThemeContext';
import CustomGroupSelectModal from '../CustomGroupSelectModal';

type Props = {
  messageId: string;
  editorState: EditorState;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  onPost?: () => Promise<void>;
};

export default function Editor(props: Props): ReactElement {
  const { messageId, editorState, disabled, readOnly, loading } = props;

  const address = useAccount();
  const user = useUser(address);
  const incognitoGroup = usePostingGroup();
  const draft = useDraft(messageId);
  const dispatch = useDispatch();
  const gun = useGunKey();
  const history = useHistory();
  const selectedId = useSelectedLocalId();
  const isEmpty = !editorState.getCurrentContent().hasText() && !draft.attachment;
  const mirror = useMirror();
  const selectedZKGroup = useSelectedZKGroup();
  const [errorMessage, setErrorMessage] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [showingImageUploadModal, setShowingImageUploadModal] = useState(false);
  const [showingLinkModal, setShowingLinkModal] = useState(false);
  const [showingCustomGroupsModal, setShowingCustomGroupsModal] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedSession, setVerifiedSession] = useState('');
  const meta = useMeta(messageId);
  const modOverride = usePostModeration(meta?.rootId);
  const commentDisabled = useCommentDisabled(meta?.rootId);
  const shouldDisplayWarning = !!modOverride?.unmoderated && commentDisabled;
  const canNonPostMessage = useCanNonPostMessage();
  const theme = useThemeContext();
  const bgColor = classNames({
    'bg-white': theme !== 'dark',
    'bg-dark': theme === 'dark',
  });

  useEffect(() => {
    (async function () {
      setVerified(false);
      setVerifiedSession('');
      setVerifying(true);
      dispatch(setMirror(false));

      if (!selectedId) return;

      let session;

      try {
        session = await getSession(selectedId);

        if (session) {
          setVerifiedSession(session.username);
          dispatch(setMirror(!!localStorage.getItem(`${session.username}_should_mirror`)));
        }
      } catch (e) {
        console.error(e);
      }

      if (await verifyTweet(user?.address, user?.twitterVerification, session?.username)) {
        setVerified(true);
      }

      setVerifying(false);
    })();
  }, [selectedId, user]);

  const onChange = useCallback(
    (newEditorState: EditorState) => {
      if (readOnly) return;
      setErrorMessage('');
      dispatch(
        setDraft({
          editorState: newEditorState,
          reference: messageId,
          attachment: draft.attachment,
          moderation: draft.moderation,
          global: draft.global,
        })
      );
    },
    [messageId, readOnly, draft]
  );

  const onModerationChange = useCallback(
    (type: ModerationMessageSubType | null) => {
      if (readOnly) return;
      dispatch(setModeration(messageId || '', type));
    },
    [messageId]
  );

  const onSetMirror = useCallback(
    async (e: any) => {
      const checked = e.target.checked;

      if (!verifiedSession || !verified) {
        history.push('/connect/twitter');
        return;
      }

      if (verified) {
        localStorage.setItem(`${verifiedSession}_should_mirror`, checked ? '1' : '');
        dispatch(setMirror(checked));
      }
    },
    [verified, verifiedSession]
  );

  const onChangeGroup = useCallback(
    (groupId: string) => {
      dispatch(setPostingGroup(groupId));
      setShowingCustomGroupsModal(false);
    },
    [incognitoGroup]
  );

  const onAddLink = useCallback(
    (url: string) => {
      if (readOnly) return;

      dispatch(
        setDraft({
          editorState: draft.editorState,
          reference: draft.reference,
          attachment: url,
        })
      );

      setShowingImageUploadModal(false);
      setShowingLinkModal(false);
    },
    [messageId, readOnly, draft]
  );

  const handleKeyCommand: (command: string) => DraftHandleValue = useCallback(
    (command: string): DraftHandleValue => {
      const newState = RichUtils.handleKeyCommand(editorState, command);
      if (newState) {
        onChange && onChange(newState);
        return 'handled';
      }
      return 'not-handled';
    },
    [editorState]
  );

  const onPost = useCallback(async () => {
    if (mirror && (!verifiedSession || !verified)) {
      history.push('/connect/twitter');
      return;
    }
    setErrorMessage('');
    try {
      if (props.onPost) {
        await props.onPost();
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(e.message);
    }
  }, [props.onPost, verified, verifiedSession, mirror]);

  const onGlobalChange = useCallback(
    (e: any) => {
      dispatch(setGloabl(messageId, e.target.checked));
    },
    [messageId]
  );

  if (!disabled && gun.priv && gun.pub && !gun.joinedTx) {
    return (
      <div
        className={classNames(
          'flex flex-col flex-nowrap items-center',
          'p-4',
          bgColor,
          'rounded-xl',
          props.className
        )}>
        <Icon className="opacity-50" url={SpinnerGif} size={4} />
      </div>
    );
  }

  if (selectedId?.type === 'interrep' && !selectedId.identityPath) {
    return (
      <div
        className={classNames(
          'flex flex-col flex-nowrap items-center',
          'p-4',
          bgColor,
          'rounded-xl',
          props.className
        )}>
        <div
          className={classNames('mt-2 mb-4', {
            'text-gray-800': theme !== 'dark',
            'text-gray-200': theme === 'dark',
          })}>
          Join Interrep to make a post
        </div>
        <Button btnType="primary" onClick={() => history.push('/onboarding/interrep')}>
          Join Interrep
        </Button>
      </div>
    );
  }

  if (!disabled && !selectedId) {
    return (
      <div
        className={classNames(
          'flex flex-col flex-nowrap items-center',
          'p-4',
          bgColor,
          'rounded-xl',
          props.className,
          {
            'border-gray-100': theme !== 'dark',
            'border-gray-800': theme === 'dark',
          }
        )}>
        <div
          className={classNames('mt-2 mb-4', {
            'text-gray-800': theme !== 'dark',
            'text-gray-200': theme === 'dark',
          })}>
          Connect to a wallet to make a post
        </div>
        <Web3Button
          className={classNames('rounded-xl border', {
            'border-gray-100': theme !== 'dark',
            'border-gray-800': theme === 'dark',
          })}
        />
      </div>
    );
  }

  return (
    <div
      className={classNames(
        'flex flex-col flex-nowrap',
        'pt-3 pb-2 px-4',
        bgColor,
        'rounded-xl',
        'text-lg',
        'editor',
        props.className
      )}>
      <div className="flex flex-row flex-nowrap w-full h-full">
        <Avatar
          className="w-12 h-12 mr-3"
          address={address}
          group={selectedZKGroup || incognitoGroup}
          incognito={
            ['interrep', 'zkpr_interrep', 'taz'].includes(selectedId?.type as string) ||
            !!incognitoGroup
          }
        />
        <div className="flex flex-row flex-nowrap w-full h-full">
          <div className="flex flex-col flex-nowrap w-full h-full editor__wrapper">
            {shouldDisplayWarning && (
              <div className="rounded p-2 text-sm bg-yellow-100 text-yellow-500">
                You can still submit a reply, but it will be hidden by default due to the OP's reply
                polilcy.
              </div>
            )}
            <DraftEditor
              editorState={editorState}
              onChange={onChange}
              handleKeyCommand={handleKeyCommand}
              placeholder={readOnly ? '' : 'Write here...'}
              readOnly={readOnly || disabled}
            />
            {selectedId?.type === 'gun' && !messageId && !incognitoGroup && (
              <ModerationButton
                onChange={onModerationChange}
                currentType={draft.moderation || null}
              />
            )}
            {draft.attachment && (
              <div className="editor__attachment py-2">
                <URLPreview url={draft.attachment} onRemove={() => onAddLink('')} editable />
              </div>
            )}
            {errorMessage && (
              <div className="error-message text-xs text-center text-red-500 m-2">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        className={classNames('flex flex-row flex-nowrap border-t pt-2 ml-15', {
          'border-gray-100': theme !== 'dark',
          'border-gray-800': theme === 'dark',
        })}>
        <div className="flex-grow pr-4 mr-4 flex flex-row flex-nowrap items-center">
          {selectedId?.type === 'gun' && (
            <Icon
              className={classNames('editor__button text-blue-300 w-8 h-8 relative', {
                'hover:bg-blue-50 hover:text-blue-400': theme !== 'dark',
                'hover:bg-blue-900 hover:text-blue-600': theme === 'dark',
              })}
              fa="fas fa-user-secret"
              onClick={() => setShowingCustomGroupsModal(true)}
            />
          )}
          <Icon
            className={classNames('editor__button text-blue-300 w-8 h-8 relative', {
              'hover:bg-blue-50 hover:text-blue-400': theme !== 'dark',
              'hover:bg-blue-900 hover:text-blue-600': theme === 'dark',
            })}
            fa="fas fa-image"
            onClick={() => setShowingImageUploadModal(true)}
          />
          <Icon
            className={classNames('editor__button text-blue-300 w-8 h-8 relative', {
              'hover:bg-blue-50 hover:text-blue-400': theme !== 'dark',
              'hover:bg-blue-900 hover:text-blue-600': theme === 'dark',
            })}
            fa="fas fa-link"
            onClick={() => setShowingLinkModal(true)}
          />
        </div>
        <div className="flex-grow flex flex-row flex-nowrap items-center justify-end">
          <Button
            className="editor__submit-btn"
            btnType="primary"
            onClick={onPost}
            disabled={isEmpty}
            loading={loading}>
            <div className="editor__submit-btn__wrapper">
              <div className="editor__submit-btn__wrapper__text">
                {!draft?.global && selectedId?.type === 'gun' && !incognitoGroup
                  ? 'Post to my own feed'
                  : 'Post to global feed'}
              </div>
              {canNonPostMessage && !incognitoGroup && (
                <Menuable
                  items={[
                    {
                      label: 'Make a public post',
                      className: 'editor__post-menu',
                      component: (
                        <div className="flex flex-col">
                          <div className="flex flex-row mb-2">
                            <Checkbox
                              className="mr-4 text-gray-500"
                              onChange={onGlobalChange}
                              checked={!!draft?.global}>
                              Post to global timeline
                            </Checkbox>
                          </div>
                          {!['interrep', 'zkpr_interrep', 'taz'].includes(
                            selectedId?.type as string
                          ) && (
                            <div className="flex flex-row">
                              <Checkbox
                                className="mr-4 text-gray-500"
                                onChange={onSetMirror}
                                checked={mirror}
                                disabled={verifying}>
                                Mirror to Twitter
                              </Checkbox>
                            </div>
                          )}
                        </div>
                      ),
                    },
                  ]}>
                  <Icon fa="fas fa-caret-down" />
                </Menuable>
              )}
            </div>
          </Button>
        </div>
      </div>
      {showingCustomGroupsModal && (
        <CustomGroupSelectModal
          onChange={onChangeGroup}
          onClose={() => setShowingCustomGroupsModal(false)}
        />
      )}
      {showingImageUploadModal && (
        <FileUploadModal
          onClose={() => setShowingImageUploadModal(false)}
          onAccept={onAddLink}
          mustLinkBeImage
        />
      )}
      {showingLinkModal && (
        <LinkInputModal onClose={() => setShowingLinkModal(false)} onAccept={onAddLink} />
      )}
    </div>
  );
}
