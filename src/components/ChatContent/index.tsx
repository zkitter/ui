import './chat-content.scss';
import React, {
  ChangeEvent,
  KeyboardEvent,
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import classNames from 'classnames';
import { useParams } from 'react-router';
import InfiniteScrollable from '../InfiniteScrollable';
import { useSelectedLocalId, useSelectedZKGroup } from '../../ducks/worker';
import Nickname from '../Nickname';
import Avatar, { Username } from '../Avatar';
import Textarea from '../Textarea';
import { generateZkIdentityFromHex, sha256, signWithP256 } from '../../util/crypto';
import { FromNow } from '../ChatMenu';
import {
  setLastReadForChatId,
  useChatId,
  useChatMessage,
  useMessagesByChatId,
  zkchat,
} from '../../ducks/chats';
import Icon from '../Icon';
import SpinnerGIF from '../../../static/icons/spinner.gif';
import { useDispatch } from 'react-redux';
import { findProof } from '../../util/merkle';
import { Strategy, ZkIdentity } from '@zk-kit/identity';
import { Chat } from '../../util/zkchat';
import { Identity } from '@semaphore-protocol/identity';

export default function ChatContent(): ReactElement {
  const { chatId } = useParams<{ chatId: string }>();
  const messages = useMessagesByChatId(chatId);
  const chat = useChatId(chatId);
  const params = useParams<{ chatId: string }>();
  const dispatch = useDispatch();

  const loadMore = useCallback(async () => {
    if (!chat) return;
    await zkchat.fetchMessagesByChat(chat);
  }, [chat]);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    dispatch(setLastReadForChatId(chatId));
  }, [chatId, messages]);

  if (!chat) return <></>;

  return (
    <div
      className={classNames('chat-content', {
        'chat-content--anon': chat?.senderHash,
        'chat-content--chat-selected': params.chatId,
      })}>
      <ChatHeader />
      <InfiniteScrollable
        className="chat-content__messages"
        onScrolledToTop={loadMore}
        topOffset={128}>
        {messages.map(messageId => {
          return <ChatMessageBubble key={messageId} messageId={messageId} chat={chat} />;
        })}
      </InfiniteScrollable>
      <ChatEditor />
    </div>
  );
}

function ChatHeader(): ReactElement {
  const { chatId } = useParams<{ chatId: string }>();
  const chat = useChatId(chatId);

  return (
    <div className="chat-content__header">
      <Avatar
        className="w-10 h-10"
        address={chat?.receiver}
        incognito={!chat?.receiver}
        group={chat?.type === 'DIRECT' ? chat.group : undefined}
      />
      <div className="flex flex-col flex-grow flex-shrink ml-2">
        <Nickname
          className="font-bold"
          address={chat?.receiver}
          group={chat?.type === 'DIRECT' ? chat.group : undefined}
        />
        <div
          className={classNames('text-xs', {
            'text-gray-500': true,
          })}>
          {chat?.receiver && (
            <>
              <span>@</span>
              <Username address={chat?.receiver || ''} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatEditor(): ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { chatId } = useParams<{ chatId: string }>();
  const selected = useSelectedLocalId();
  const [content, setContent] = useState('');
  const chat = useChatId(chatId);
  const [error, setError] = useState('');
  const [isSending, setSending] = useState(false);
  const dispatch = useDispatch();
  const zkGroup = useSelectedZKGroup();

  useEffect(() => {
    setContent('');
  }, [chatId]);

  const submitMessage = useCallback(async () => {
    if (!chat || !content) return;

    let signature = '';
    let merkleProof, identitySecretHash;

    if (selected?.type === 'gun') {
      signature = signWithP256(selected.privateKey, selected.address) + '.' + selected.address;
      if (chat.senderHash) {
        const zkseed = await signWithP256(selected.privateKey, 'signing for zk identity - 0');
        const zkHex = await sha256(zkseed);
        const zkIdentity = await generateZkIdentityFromHex(zkHex);
        merkleProof = await findProof(
          'zksocial_all',
          zkIdentity.genIdentityCommitment().toString(16)
        );
        identitySecretHash = zkIdentity.getSecretHash();
      }
    } else if (selected?.type === 'interrep') {
      const { type, provider, name, identityCommitment, serializedIdentity } = selected;
      const group = `${type}_${provider.toLowerCase()}_${name}`;
      const zkIdentity = new ZkIdentity(Strategy.SERIALIZED, serializedIdentity);
      merkleProof = await findProof(group, BigInt(identityCommitment).toString(16));
      identitySecretHash = zkIdentity.getSecretHash();
    } else if (selected?.type === 'taz') {
      const { type, identityCommitment, serializedIdentity } = selected;
      const group = `semaphore_taz_members`;
      const zkIdentity = new Identity(serializedIdentity);
      merkleProof = await findProof(group, BigInt(identityCommitment).toString(16));
    }

    const json = await zkchat.sendDirectMessage(
      chat,
      content,
      {
        'X-SIGNED-ADDRESS': signature,
      },
      merkleProof,
      identitySecretHash
    );

    setContent('');
  }, [content, selected, chat]);

  const onClickSend = useCallback(async () => {
    setSending(true);
    setError('');
    try {
      await submitMessage();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }, [submitMessage]);

  const onEnter = useCallback(
    async (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (window.innerWidth < 768) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        setSending(true);
        setError('');
        try {
          await submitMessage();
        } catch (e) {
          setError(e.message);
        } finally {
          setSending(false);
          textareaRef.current?.focus();
        }
      }
    },
    [submitMessage, textareaRef]
  );

  const onChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setError('');
  }, []);

  return (
    <div className="chat-content__editor-wrapper">
      {!!error && (
        <small className="error-message text-xs text-center text-red-500 mb-1 mt-2">{error}</small>
      )}
      <div className="flex flex-row w-full">
        <div className="chat-content__editor ml-2">
          <Textarea
            _ref={textareaRef}
            key={chatId}
            className="text-light border mr-2 my-2"
            // ref={(el) => el?.focus()}
            rows={Math.max(0, content.split('\n').length)}
            value={content}
            onChange={onChange}
            onKeyPress={onEnter}
            disabled={isSending}
            autoFocus
          />
        </div>
        <div className="relative flex flex-row items-end">
          {content ? (
            <Icon
              className={classNames('m-2 text-white justify-center rounded-full', {
                'opacity-50': isSending,
                'w-10 h-10': !isSending,
                'bg-primary-color': !zkGroup,
                'bg-gray-800': zkGroup,
              })}
              onClick={onClickSend}
              fa={isSending ? undefined : 'fas fa-paper-plane'}
              url={isSending ? SpinnerGIF : undefined}
              size={isSending ? 2.5 : undefined}
            />
          ) : (
            <Avatar
              className={classNames('w-10 h-10 m-2', {
                'opacity-50': isSending,
              })}
              address={selected?.address}
              incognito={!!chat?.senderHash}
              group={zkGroup}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatMessageBubble(props: { messageId: string; chat: Chat }) {
  const chatMessage = useChatMessage(props.messageId);

  if (chatMessage?.type !== 'DIRECT') return <></>;

  return (
    <div
      key={chatMessage.messageId}
      className={classNames('chat-message', {
        'chat-message--self': chatMessage.sender.ecdh === props.chat.senderECDH,
        'chat-message--anon': chatMessage.sender.hash,
      })}>
      <div
        className={classNames('chat-message__content text-light', {
          'italic opacity-70': chatMessage.encryptionError,
        })}>
        {chatMessage.encryptionError ? 'Cannot decrypt message' : chatMessage.content}
      </div>
      <FromNow
        className="chat-message__time text-xs mt-2 text-gray-700"
        timestamp={chatMessage.timestamp}
      />
    </div>
  );
}
