import './chat-menu.scss';
import React, { MouseEvent, ReactElement, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import Avatar from '../Avatar';
import { useSelectedLocalId, useSelectedZKGroup } from '@ducks/worker';
import moment from 'moment';
import config from '~/config';
import Nickname from '../Nickname';
import { useHistory, useParams } from 'react-router';
import {
  addChat,
  useChatId,
  useChatIds,
  useLastNMessages,
  useUnreadChatMessages,
} from '@ducks/chats';
import Icon from '../Icon';
import Input from '../Input';
import Modal, { ModalFooter, ModalHeader } from '../Modal';
import Button from '../Button';
import { getName } from '~/user';
import { fetchUserByECDH, useUser, useUserByECDH } from '@ducks/users';
import { useThemeContext } from '../ThemeContext';
import { ChatMeta } from 'zkitter-js/dist/src/models/chats';
import {
  ChatMessageSubType,
  generateECDHKeyPairFromZKIdentity,
  generateECDHWithP256,
  Chats,
} from 'zkitter-js';
import { Strategy, ZkIdentity } from '@zk-kit/identity';
import { safeJsonParse } from '~/misc';
import crypto from 'crypto';
import { useDispatch } from 'react-redux';
const { deriveChatId } = Chats;

export default function ChatMenu(): ReactElement {
  const selected = useSelectedLocalId();
  const chatIds = useChatIds();
  const [showingCreateChat, setShowingCreateChat] = useState(false);
  const [selectedNewConvo, selectNewConvo] = useState<string | null>(null);
  const params = useParams<{ chatId: string }>();

  if (!selected) return <></>;

  if (showingCreateChat) {
    return (
      <CreateChatMenu
        onBack={() => {
          setShowingCreateChat(false);
        }}
      />
    );
  }

  return (
    <div
      className={classNames('chat-menu', {
        'chat-menu--chat-selected': params.chatId,
      })}>
      <div className="chat-menu__header">
        <div className="flex flex-row chat-menu__header__r">
          <div className="text-xs font-bold flex-grow ml-2">Conversations</div>
          <Icon
            className="chat-menu__create-icon text-gray-400 hover:text-gray-800 py-2 px-2"
            fa="fas fa-plus"
            size={0.75}
            onClick={() => setShowingCreateChat(true)}
          />
        </div>
      </div>
      {chatIds.map(chatId => (
        <ChatMenuItem key={chatId} chatId={chatId} selectNewConvo={selectNewConvo} />
      ))}
    </div>
  );
}

function CreateChatMenu(props: { onBack: () => void }): ReactElement {
  const [searchParam, setSearchParam] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');

  const onSearchNewChatChange = useCallback(async (param: string) => {
    setSearchParam(param);
    const res = await fetch(`${config.indexerAPI}/v1/zkchat/chats/search/${param}`);
    const json = await res.json();
    setSearchResults(json.payload.map((data: any) => data.receiver_address));
  }, []);

  useEffect(() => {
    onSearchNewChatChange('');
  }, [onSearchNewChatChange]);

  return (
    <div className="chat-menu">
      <div className="chat-menu__header">
        <div className="flex flex-row chat-menu__header__r">
          <Icon
            className="chat-menu__create-icon text-gray-400 hover:text-gray-800 py-2 pl-2"
            fa="fas fa-arrow-left"
            size={0.75}
            onClick={props.onBack}
          />
          <div className="text-xs font-bold flex-grow ml-2">Create New Conversation</div>
        </div>
        <Input
          className="border text-sm chat-menu__search"
          onChange={e => onSearchNewChatChange(e.target.value)}
          value={searchParam}
          placeholder="search">
          <Icon className="text-gray-400 mx-2" fa="fas fa-search" size={0.75} />
        </Input>
      </div>
      {searchResults.length ? (
        searchResults.map((address: string) => (
          <CreateChatMenuItem
            key={address}
            receiverAddress={address}
            onClick={() => setSelectedAddress(address)}
          />
        ))
      ) : (
        <div className="text-center text-light text-gray-400 font-semibold my-2">
          No conversations found
        </div>
      )}
      {selectedAddress && (
        <CreateChatOptionModal
          address={selectedAddress}
          onClose={() => {
            setSelectedAddress('');
            props.onBack();
          }}
        />
      )}
    </div>
  );
}

function CreateChatMenuItem(props: { receiverAddress: string; onClick: () => void }): ReactElement {
  return (
    <div className="flex flex-row chat-menu__item" onClick={props.onClick}>
      <div className="relative">
        <Avatar className="w-12 h-12 flex-grow-0 flex-shrink-0" address={props.receiverAddress} />
      </div>
      <div className="flex flex-col flex-grow flex-shrink mx-4 w-0">
        <Nickname className="font-bold truncate" address={props.receiverAddress} />
      </div>
      <div className="flex flex-col items-end justify-center" />
    </div>
  );
}

function CreateChatOptionModal(props: { address: string; onClose: () => void }): ReactElement {
  const selected = useSelectedLocalId();
  const user = useUser(selected?.address);
  const r_user = useUser(props.address);
  const dispatch = useDispatch();
  const history = useHistory();

  const startChat = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (!r_user) return;

      let senderECDH,
        senderSeed = '';

      if (selected?.type === 'gun') {
        senderECDH = await generateECDHWithP256(selected.privateKey, 0);
      } else if (selected?.type === 'interrep') {
        senderECDH = await generateECDHKeyPairFromZKIdentity(
          new ZkIdentity(Strategy.SERIALIZED, selected.serializedIdentity)
        );
      } else if (selected?.type === 'taz') {
        const [trapdoor, nullifier] = safeJsonParse(selected.serializedIdentity) || [];
        if (trapdoor && nullifier) {
          senderSeed = crypto.randomBytes(16).toString('hex');
          senderECDH = await generateECDHKeyPairFromZKIdentity(
            new ZkIdentity(
              Strategy.SERIALIZED,
              JSON.stringify({
                identityNullifier: nullifier,
                identityTrapdoor: trapdoor,
                secret: [nullifier, trapdoor],
              })
            ),
            senderSeed
          );
        }
      }

      if (!senderECDH) return;

      const chatId = await deriveChatId(r_user.ecdh, senderECDH.pub);
      const chatMeta: ChatMeta = {
        type: ChatMessageSubType.Direct,
        senderECDH: senderECDH.pub,
        senderSeed: senderSeed,
        receiverECDH: r_user.ecdh,
        chatId,
      };

      dispatch(addChat(chatMeta));
      props.onClose();
      history.push(`/chat/${chatId}`);
    },
    [props.address, r_user, selected]
  );

  if (!user) return <></>;

  return (
    <Modal className="w-96" onClose={props.onClose}>
      <ModalHeader>Create New Chat</ModalHeader>
      <ModalFooter className="create-chat-options__footer">
        {selected?.type === 'gun' ? (
          <Button className="mr-1 create-chat-options__create-btn" onClick={startChat}>
            <Avatar className="w-10 h-10" address={selected.address} />
            <div className="ml-2">{`Chat as ${getName(user)}`}</div>
          </Button>
        ) : (
          <Button
            className="mr-1 create-chat-options__create-btn create-chat-options__create-btn--anon"
            onClick={startChat}>
            <Avatar className="w-10 h-10 bg-black" incognito />
            <div className="ml-2">Chat anonymously</div>
          </Button>
        )}
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
  hideLastChat?: boolean;
  selectNewConvo: (address: string) => void;
}): ReactElement {
  const selected = useSelectedLocalId();
  const zkGroup = useSelectedZKGroup();
  const chat = useChatId(props.chatId);
  const params = useParams<{ chatId: string }>();
  const history = useHistory();
  const [last] = useLastNMessages(props.chatId, 1);
  const theme = useThemeContext();
  const unreads = useUnreadChatMessages(props.chatId);
  const receiverAddress = useUserByECDH(chat?.receiverECDH || '');
  const rUser = useUser(receiverAddress || '');
  const dispatch = useDispatch();

  const isSelected = props.chatId === params.chatId;

  useEffect(() => {
    if (!rUser && chat?.receiverECDH) {
      dispatch(fetchUserByECDH(chat.receiverECDH));
    }
  }, [rUser, chat?.receiverECDH]);

  const onClick = useCallback(async () => {
    if (!chat) return;
    history.push(`/chat/${props.chatId}`);
  }, [props.chatId, selected]);

  useEffect(() => {
    if (!props.chatId || !chat) return;
    (async () => {
      // fetch messages
      // update filters?
    })();
  }, [props.chatId, chat]);

  if (!chat) return <></>;

  return (
    <div
      className={classNames('flex flex-row chat-menu__item', {
        'chat-menu__item--selected': isSelected,
        'chat-menu__item--anon': chat.type === 'DIRECT' && chat.senderSeed,
      })}
      onClick={onClick}>
      <div className="relative">
        <Avatar
          className="w-12 h-12 flex-grow-0 flex-shrink-0"
          address={receiverAddress || ''}
          incognito={!receiverAddress}
          // group={!receiverAddress ? chat.group : undefined}
        />
        {chat.senderSeed && (
          <Avatar
            className={classNames('chat-menu__item__anon-marker', {
              'bg-gray-800': !zkGroup,
            })}
            incognito
            group={zkGroup}
          />
        )}
      </div>
      <div className="flex flex-col flex-grow flex-shrink mx-4 w-0">
        <Nickname
          className="font-bold truncate"
          address={receiverAddress || ''}
          // group={chat.type === 'DIRECT' ? chat.group : undefined}
        />
        {!props.hideLastChat && (
          <div
            className={classNames('text-sm truncate', {
              'text-gray-800': theme !== 'dark',
              'text-gray-200': theme === 'dark',
            })}>
            {last?.payload.content}
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
            {last?.createdAt && <FromNow className="text-xs" timestamp={last.createdAt} />}
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
