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
import { getZKGroupFromIdentity, useSelectedLocalId, useSelectedZKGroup } from '@ducks/worker';
import Nickname from '../Nickname';
import Avatar, { Username } from '../Avatar';
import Textarea from '../Textarea';
import { FromNow } from '../ChatMenu';
import {
  fetchChatMessages,
  getChatById,
  InflatedChat,
  setLastReadForChatId,
  useChatMessage,
  useMessagesByChatId,
} from '@ducks/chats';
import Icon from '../Icon';
import SpinnerGIF from '#/icons/spinner.gif';
import { useDispatch } from 'react-redux';
import { fetchUserByECDH, useUserAddressByECDH } from '@ducks/users';
import { ChatMessageSubType, MessageType, deriveSharedSecret, decrypt } from 'zkitter-js';
import { useZkitter } from '@ducks/zkitter';
import { deserializeZKIdentity, getECDHFromLocalIdentity } from '~/zk';

export default function ChatContent(): ReactElement {
  const { chatId } = useParams<{ chatId: string }>();
  const messages = useMessagesByChatId(chatId);
  const [chat, setChat] = useState<InflatedChat | null>(null);
  const dispatch = useDispatch();

  const loadMore = useCallback(async () => {
    if (!chat) return;
    dispatch(fetchChatMessages(chatId));
  }, [chat, chatId]);

  useEffect(() => {
    loadMore();
  }, [loadMore, chatId]);

  useEffect(() => {
    dispatch(setLastReadForChatId(chatId));
  }, [chatId, messages]);

  useEffect(() => {
    let unmounted = false;

    (async () => {
      const inflatedChat: any = await dispatch(getChatById(chatId));
      if (!unmounted) setChat(inflatedChat as InflatedChat);
    })();

    return () => {
      unmounted = true;
    };
  }, [chatId]);

  if (!chat) return <></>;

  return (
    <div
      className={classNames('chat-content', {
        // 'chat-content--anon': chat?.senderSeed,
        'chat-content--chat-selected': chatId,
      })}>
      <ChatHeader />
      <InfiniteScrollable
        className="chat-content__messages"
        onScrolledToTop={loadMore}
        topOffset={128}>
        {messages.map(messageId => {
          return <ChatMessageBubble key={messageId} messageId={messageId} chatId={chatId} />;
        })}
      </InfiniteScrollable>
      <ChatEditor />
    </div>
  );
}

function ChatHeader(): ReactElement {
  const { chatId } = useParams<{ chatId: string }>();
  const [chat, setChat] = useState<InflatedChat | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    let unmounted = false;

    (async () => {
      const inflatedChat: any = await dispatch(getChatById(chatId));
      if (!unmounted) setChat(inflatedChat as InflatedChat);
    })();

    return () => {
      unmounted = true;
    };
  }, [chatId]);

  return (
    <div className="chat-content__header">
      <Avatar
        key={chat?.receiverECDH}
        className="w-10 h-10"
        address={chat?.receiverAddress || ''}
        incognito={!chat?.receiverAddress}
        group={chat?.receiverGroupId}
      />
      <div className="flex flex-col flex-grow flex-shrink ml-2 justify-center">
        <Nickname
          key={chat?.receiverECDH}
          className="font-bold"
          address={chat?.receiverAddress || ''}
          group={chat?.receiverGroupId}
        />
        <div
          className={classNames('text-xs', {
            'text-gray-500': true,
          })}>
          {chat?.receiverAddress && (
            <>
              <span>@</span>
              <Username address={chat.receiverAddress || ''} />
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
  const [error, setError] = useState('');
  const [isSending, setSending] = useState(false);
  const zkGroup = useSelectedZKGroup();
  const zkitter = useZkitter();
  const [chat, setChat] = useState<InflatedChat | null>(null);
  const dispatch = useDispatch();

  useEffect(() => {
    let unmounted = false;

    (async () => {
      const inflatedChat: any = await dispatch(getChatById(chatId));
      if (!unmounted) setChat(inflatedChat as InflatedChat);
    })();

    return () => {
      unmounted = true;
    };
  }, [chatId]);

  useEffect(() => {
    setContent('');
  }, [chatId]);

  const submitMessage = useCallback(async () => {
    if (!chat || !content || !zkitter) return;

    let me;

    if (selected?.type === 'gun') {
      me = await zkitter.authorize({
        type: 'ecdsa',
        address: selected.address,
        privateKey: selected.privateKey,
      });
    } else if (selected?.type === 'interrep' || selected?.type === 'taz') {
      const zkIdentity = deserializeZKIdentity(selected.serializedIdentity);
      me = await zkitter.authorize({
        type: 'zk',
        zkIdentity: zkIdentity!,
        groupId: getZKGroupFromIdentity(selected),
      });
    }

    if (me) {
      await me.directMessage({
        content,
        ecdh: chat.receiverECDH,
        seedOverride: selected?.type === 'gun' ? undefined : chat.senderSeed,
      });
    }

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

function ChatMessageBubble(props: { messageId: string; chatId: string }) {
  const selected = useSelectedLocalId();
  const chatMessage = useChatMessage(props.messageId);
  const [decrypted, setDecrypted] = useState('');
  const [isSelf, setSelf] = useState(false);
  const [chat, setChat] = useState<InflatedChat | null>(null);
  const dispatch = useDispatch();
  const receiverAddress = useUserAddressByECDH(chat?.receiverECDH);
  const senderAddress = useUserAddressByECDH(chat?.senderECDH);

  useEffect(() => {
    let unmounted = false;

    (async () => {
      const inflatedChat: any = await dispatch(getChatById(props.chatId));
      if (!unmounted) setChat(inflatedChat as InflatedChat);
    })();

    return () => {
      unmounted = true;
    };
  }, [props.chatId]);

  useEffect(() => {
    if (chatMessage?.type !== MessageType.Chat) return;
    if (chatMessage?.subtype !== ChatMessageSubType.Direct) return;

    const {
      payload: { senderSeed, senderECDH, receiverECDH, content, encryptedContent },
    } = chatMessage;

    (async () => {
      if (typeof content !== 'undefined') {
        setDecrypted(content);
      }

      let myECDH;

      if (selected?.type === 'gun') {
        myECDH = await getECDHFromLocalIdentity(selected);
      } else if (selected?.type === 'interrep' || selected?.type === 'taz') {
        const isSenderAnon = !senderAddress;
        const seed = isSenderAnon ? receiverAddress : senderSeed;
        myECDH = await getECDHFromLocalIdentity(selected, seed);
      }

      if (myECDH) {
        const rECDH = myECDH.pub === senderECDH ? receiverECDH : senderECDH;
        setSelf(myECDH.pub === senderECDH);

        if (typeof content === 'undefined') {
          const sharedKey = deriveSharedSecret(rECDH, myECDH.priv);
          setDecrypted(decrypt(encryptedContent, sharedKey));
        }
      }
    })();
  }, [selected, senderAddress, receiverAddress, chatMessage]);

  if (chatMessage?.type !== MessageType.Chat) return <></>;
  if (chatMessage?.subtype !== ChatMessageSubType.Direct) return <></>;

  return (
    <div
      key={chatMessage.hash()}
      className={classNames('chat-message', {
        'chat-message--self': isSelf,
        // 'chat-message--anon': senderSeed,
      })}>
      <div
        className={classNames('chat-message__content text-light', {
          'italic opacity-70': typeof decrypted === 'undefined',
        })}>
        {typeof decrypted === 'undefined' ? 'Cannot decrypt message' : decrypted}
      </div>
      <FromNow
        className="chat-message__time text-xs mt-2 text-gray-700"
        timestamp={chatMessage.createdAt}
      />
    </div>
  );
}
