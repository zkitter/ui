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
import { useSelectedLocalId, useSelectedZKGroup } from '@ducks/worker';
import Nickname from '../Nickname';
import Avatar, { Username } from '../Avatar';
import Textarea from '../Textarea';
import { generateZkIdentityFromHex, sha256, signWithP256 } from '~/crypto';
import { FromNow } from '../ChatMenu';
import { setLastReadForChatId, useChatId, useChatMessage, useMessagesByChatId } from '@ducks/chats';
import Icon from '../Icon';
import SpinnerGIF from '#/icons/spinner.gif';
import { findProof } from '~/merkle';
import { Strategy, ZkIdentity } from '@zk-kit/identity';
import { useDispatch } from 'react-redux';
import { fetchUserByECDH, useUser, useUserByECDH } from '@ducks/users';
import { ChatMessageSubType, MessageType } from 'zkitter-js';
import { ChatMeta } from 'zkitter-js/dist/src/models/chats';
import { useZkitter } from '@ducks/zkitter';

export default function ChatContent(): ReactElement {
  const { chatId } = useParams<{ chatId: string }>();
  const messages = useMessagesByChatId(chatId);
  const chat = useChatId(chatId);
  const params = useParams<{ chatId: string }>();
  const dispatch = useDispatch();

  const loadMore = useCallback(async () => {
    if (!chat) return;
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
        'chat-content--anon': chat?.senderSeed,
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
  const receiverAddress = useUserByECDH(chat?.receiverECDH || '');
  const rUser = useUser(receiverAddress || '');
  const dispatch = useDispatch();

  useEffect(() => {
    if (!rUser && chat?.receiverECDH) {
      dispatch(fetchUserByECDH(chat.receiverECDH));
    }
  }, [rUser, chat?.receiverECDH]);

  return (
    <div className="chat-content__header">
      <Avatar
        className="w-10 h-10"
        address={receiverAddress || ''}
        incognito={!receiverAddress}
        // group={chat?.type === 'DIRECT' ? chat.group : undefined}
      />
      <div className="flex flex-col flex-grow flex-shrink ml-2">
        <Nickname
          className="font-bold"
          address={receiverAddress || ''}
          // group={chat?.type === 'DIRECT' ? chat.group : undefined}
        />
        <div
          className={classNames('text-xs', {
            'text-gray-500': true,
          })}>
          {receiverAddress && (
            <>
              <span>@</span>
              <Username address={receiverAddress || ''} />
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
  const zkGroup = useSelectedZKGroup();
  const zkitter = useZkitter();

  useEffect(() => {
    setContent('');
  }, [chatId]);

  const submitMessage = useCallback(async () => {
    if (!chat || !content || !zkitter) return;

    console.log(chat, selected, chat, zkitter);

    setContent('');
  }, [content, selected, chat, zkitter]);

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
            // @ts-ignore
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
              incognito={!!chat?.senderSeed}
              group={zkGroup}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChatMessageBubble(props: { messageId: string; chat: ChatMeta }) {
  const chatMessage = useChatMessage(props.messageId);

  if (chatMessage?.type !== MessageType.Chat) return <></>;
  if (chatMessage?.subtype !== ChatMessageSubType.Direct) return <></>;

  const {
    payload: { senderSeed, senderECDH, receiverECDH, content },
  } = chatMessage;

  return (
    <div
      key={chatMessage.hash()}
      className={classNames('chat-message', {
        'chat-message--self': senderECDH === props.chat.senderECDH,
        'chat-message--anon': senderSeed,
      })}>
      <div
        className={classNames('chat-message__content text-light', {
          'italic opacity-70': typeof content === 'undefined',
        })}>
        {typeof content === 'undefined' ? 'Cannot decrypt message' : content}
      </div>
      <FromNow
        className="chat-message__time text-xs mt-2 text-gray-700"
        timestamp={chatMessage.createdAt}
      />
    </div>
  );
}
