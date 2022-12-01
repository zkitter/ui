import './chat-menu.scss';
import React, {
  ChangeEvent,
  MouseEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from 'react';
import classNames from 'classnames';
import Avatar, { Username } from '../Avatar';
import { useSelectedLocalId, useSelectedZKGroup } from '../../ducks/worker';
import moment from 'moment';
import config from '../../util/config';
import Nickname from '../Nickname';
import { useHistory, useParams } from 'react-router';
import { useDispatch } from 'react-redux';
import chats, {
  fetchChats,
  setChats,
  useChatId,
  useChatIds,
  useLastNMessages,
  useUnreadChatMessages,
  zkchat,
} from '../../ducks/chats';
import Icon from '../Icon';
import Input from '../Input';
import { Chat } from '../../util/zkchat';
import Modal, { ModalContent, ModalFooter, ModalHeader } from '../Modal';
import Button from '../Button';
import { getName } from '../../util/user';
import { useUser } from '../../ducks/users';
import sse from '../../util/sse';
import { useThemeContext } from '../ThemeContext';

export default function ChatMenu(): ReactElement {
  const selected = useSelectedLocalId();
  const chatIds = useChatIds();
  const [showingCreateChat, setShowingCreateChat] = useState(false);
  const [selectedNewConvo, selectNewConvo] = useState<Chat | null>(null);
  const [searchParam, setSearchParam] = useState('');
  const [searchResults, setSearchResults] = useState<Chat[] | null>(null);
  const params = useParams<{ chatId: string }>();

  // useEffect(() => {
  //   if (selecteduser?.ecdh && selected?.type === 'gun') {
  //     setTimeout(() => {
  //       dispatch(fetchChats(selecteduser.ecdh));
  //     }, 500);
  //   } else if (selected?.type === 'interrep' || selected?.type === 'taz') {
  //     setTimeout(() => {
  //       dispatch(fetchChats(selected.identityCommitment));
  //     }, 500);
  //   }
  // }, [selected, selecteduser]);

  const onSearchNewChatChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    setSearchParam(e.target.value);
    const res = await fetch(`${config.indexerAPI}/v1/zkchat/chats/search/${e.target.value}`);
    const json = await res.json();

    setSearchResults(
      json.payload.map((data: any) => ({
        type: 'DIRECT',
        receiver: data.receiver_address,
        ecdh: data.receiver_ecdh,
      }))
    );
  }, []);

  if (!selected) return <></>;

  return (
    <div
      className={classNames('chat-menu', {
        'chat-menu--chat-selected': params.chatId,
      })}>
      <div className="chat-menu__header">
        <div className="flex flex-row chat-menu__header__r">
          {showingCreateChat && (
            <Icon
              className="chat-menu__create-icon text-gray-400 hover:text-gray-800 py-2 pl-2"
              fa="fas fa-arrow-left"
              size={0.75}
              onClick={() => {
                setShowingCreateChat(false);
                setSearchParam('');
                setSearchResults(null);
              }}
            />
          )}
          <div className="text-xs font-bold flex-grow ml-2">
            {showingCreateChat ? 'Create New Conversation' : 'Conversations'}
          </div>
          {!showingCreateChat && (
            <Icon
              className="chat-menu__create-icon text-gray-400 hover:text-gray-800 py-2 px-2"
              fa="fas fa-plus"
              size={0.75}
              onClick={() => {
                setShowingCreateChat(true);
                // @ts-ignore
                onSearchNewChatChange({ target: { value: '' } });
              }}
            />
          )}
        </div>
        <Input
          className="border text-sm chat-menu__search"
          onChange={showingCreateChat ? onSearchNewChatChange : () => null}
          value={searchParam}
          placeholder={!showingCreateChat ? 'Search' : 'Search by name'}>
          <Icon className="text-gray-400 mx-2" fa="fas fa-search" size={0.75} />
        </Input>
      </div>
      {!!showingCreateChat &&
        (searchResults?.length ? (
          searchResults.map(chat => (
            <ChatMenuItem
              key={chat.type + chat.receiver}
              chatId=""
              chat={chat}
              selectNewConvo={selectNewConvo}
              setCreating={setShowingCreateChat}
              isCreating={showingCreateChat}
              hideLastChat
            />
          ))
        ) : (
          <div className="text-center text-light text-gray-400 font-semibold my-2">
            No conversations found
          </div>
        ))}
      {!showingCreateChat &&
        chatIds.map(chatId => (
          <ChatMenuItem
            key={chatId}
            chatId={chatId}
            selectNewConvo={selectNewConvo}
            setCreating={setShowingCreateChat}
            isCreating={showingCreateChat}
          />
        ))}
      {selectedNewConvo && (
        <CreateChatOptionModal
          onClose={() => {
            selectNewConvo(null);
            setShowingCreateChat(false);
          }}
          chat={selectedNewConvo}
        />
      )}
    </div>
  );
}

function CreateChatOptionModal(props: { chat: Chat; onClose: () => void }): ReactElement {
  const selected = useSelectedLocalId();
  const user = useUser(selected?.address);
  const r_user = useUser(props.chat.receiver);
  const history = useHistory();

  const startChat = useCallback(
    async (e: MouseEvent<HTMLButtonElement>, isAnon: boolean) => {
      e.stopPropagation();
      if (!r_user) return;
      const chat = await zkchat.createDM(r_user.address, r_user.ecdh, isAnon);
      props.onClose();
      const chatId = zkchat.deriveChatId(chat);
      history.push(`/chat/${chatId}`);
    },
    [props.chat, r_user]
  );

  if (!user) return <></>;

  return (
    <Modal className="w-96" onClose={props.onClose}>
      <ModalHeader>
        {props.chat.type === 'DIRECT' ? 'Create Direct Message' : 'Create New Group'}
      </ModalHeader>
      <ModalFooter className="create-chat-options__footer">
        <Button className="mr-1 create-chat-options__create-btn" onClick={e => startChat(e, false)}>
          <Avatar className="w-10 h-10" address={user.address} />
          <div className="ml-2">{`Chat as ${getName(user)}`}</div>
        </Button>
        <Button
          className="mr-1 create-chat-options__create-btn create-chat-options__create-btn--anon"
          onClick={e => startChat(e, true)}>
          <Avatar className="w-10 h-10 bg-black" incognito />
          <div className="ml-2">Chat anonymously</div>
        </Button>
      </ModalFooter>
    </Modal>
  );
}

const ONE_MIN = 60 * 1000;
const ONE_HOUR = 60 * ONE_MIN;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;

function ChatMenuItem(props: {
  chatId: string;
  chat?: Chat;
  hideLastChat?: boolean;
  selectNewConvo: (chat: Chat) => void;
  setCreating: (showing: boolean) => void;
  isCreating: boolean;
}): ReactElement {
  const selected = useSelectedLocalId();
  const zkGroup = useSelectedZKGroup();
  let chat = useChatId(props.chatId);
  const params = useParams<{ chatId: string }>();
  const history = useHistory();
  const [last] = useLastNMessages(props.chatId, 1);
  const theme = useThemeContext();
  const unreads = useUnreadChatMessages(props.chatId);

  const isSelected = props.chatId === params.chatId;

  if (props.chat) {
    // @ts-ignore
    chat = props.chat;
  }

  const r_user = useUser(chat?.receiver);

  const onClick = useCallback(async () => {
    if (!chat) return;

    if (!props.isCreating) {
      history.push(`/chat/${zkchat.deriveChatId(chat)}`);
    } else {
      if (!r_user) return;
      if (['interrep', 'taz'].includes(selected?.type as string)) {
        const newChat = await zkchat.createDM(r_user.address, r_user.ecdh, true);
        const chatId = zkchat.deriveChatId(newChat);
        props.setCreating(false);
        history.push(`/chat/${chatId}`);
      } else if (selected?.type === 'gun') {
        props.selectNewConvo(chat);
      }
    }
  }, [chat, r_user, selected, props.isCreating]);

  useEffect(() => {
    if (!props.chatId || !chat) return;
    (async () => {
      await zkchat.fetchMessagesByChat(chat, 1);
      if (chat.type === 'DIRECT') {
        if (chat.senderHash && chat.senderECDH) {
          await sse.updateTopics([`ecdh:${chat.senderECDH}`]);
        }
      }
    })();
  }, [props.chatId, chat]);

  if (!chat) return <></>;

  return (
    <div
      className={classNames('flex flex-row chat-menu__item', {
        'chat-menu__item--selected': isSelected,
        'chat-menu__item--anon': chat.type === 'DIRECT' && chat.senderHash,
      })}
      onClick={onClick}>
      <div className="relative">
        <Avatar
          className="w-12 h-12 flex-grow-0 flex-shrink-0"
          address={chat.receiver || ''}
          incognito={!chat.receiver}
          group={chat.type === 'DIRECT' ? chat.group : undefined}
        />
        {chat.type === 'DIRECT' && chat.senderHash && (
          <Avatar
            className={classNames('chat-menu__item__anon-marker', {
              'bg-gray-800': !zkGroup,
              'bg-white': zkGroup,
            })}
            incognito
            group={zkGroup}
          />
        )}
      </div>
      <div className="flex flex-col flex-grow flex-shrink mx-4 w-0">
        <Nickname
          className="font-bold truncate"
          address={chat.receiver || ''}
          group={chat.type === 'DIRECT' ? chat.group : undefined}
        />
        {!props.hideLastChat && (
          <div
            className={classNames('text-sm truncate', {
              'text-gray-800': theme !== 'dark',
              'text-gray-200': theme === 'dark',
            })}>
            {last?.content}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end justify-center">
        {!!unreads && (
          <div className="flex flex-row items-center justify-center bg-red-500 text-white text-xs rounded-full w-4 h-4">
            {unreads}
          </div>
        )}
        {!props.hideLastChat && (
          <div className={classNames('flex-grow-0 flex-shrink-0 mt-1 text-gray-500')}>
            {last?.timestamp && <FromNow className="text-xs" timestamp={last.timestamp} />}
          </div>
        )}
      </div>
    </div>
  );
}

export function FromNow(props: { timestamp: Date; className?: string }): ReactElement {
  const now = new Date();
  const past = props.timestamp.getTime();
  const diff = now.getTime() - past;

  let fromNow = '';

  if (diff < ONE_MIN) {
    fromNow = 'Now';
  } else if (diff < ONE_HOUR) {
    fromNow = Math.floor(diff / ONE_MIN) + 'm';
  } else if (diff < ONE_DAY) {
    fromNow = Math.floor(diff / ONE_HOUR) + 'h';
  } else if (diff < ONE_WEEK) {
    fromNow = Math.floor(diff / ONE_DAY) + 'd';
  } else if (props.timestamp.getFullYear() === now.getFullYear()) {
    fromNow = moment(props.timestamp).format('ll').split(',')[0];
  } else {
    fromNow = moment(props.timestamp).format('ll');
  }

  return <div className={props.className}>{fromNow}</div>;
}
