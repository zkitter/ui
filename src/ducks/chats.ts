import deepEqual from 'fast-deep-equal';
import { useSelector } from 'react-redux';
import { Dispatch } from 'redux';

import { Chat, ChatMessage, ZKChatClient } from '~/zkchat';
import store, { AppRootState } from '../store/configureAppStore';
import config from '../util/config';
import sse from '../util/sse';

const EVENTS = ZKChatClient.EVENTS;

export const zkchat = new ZKChatClient({
  api: `${config.indexerAPI}/v1/zkchat`,
});

sse.on('NEW_CHAT_MESSAGE', async (payload: any) => {
  const message = await zkchat.inflateMessage(payload);
  await zkchat.prependMessage(message);
});

const onNewMessage = (message: ChatMessage) => {
  const { receiver, sender } = message;
  const chatId = zkchat.deriveChatId({
    type: 'DIRECT',
    receiver: '',
    receiverECDH: receiver.ecdh!,
    senderECDH: sender.ecdh!,
  });
  store.dispatch(setMessage(message));
  store.dispatch(setMessagesForChat(chatId, zkchat.activeChats[chatId].messages));
};

zkchat.on(EVENTS.MESSAGE_APPENDED, onNewMessage);
zkchat.on(EVENTS.MESSAGE_PREPENDED, onNewMessage);
zkchat.on(EVENTS.CHAT_CREATED, (chat: Chat) => {
  store.dispatch(addChat(chat));
});

enum ActionTypes {
  SET_CHATS = 'chats/setChats',
  SET_MESSAGES_FOR_CHAT = 'chats/setMessagesForChat',
  ADD_CHAT = 'chats/addChat',
  SET_CHAT_NICKNAME = 'chats/setChatNickname',
  SET_MESSAGE = 'chats/SET_MESSAGE',
}

type Action<payload> = {
  type: ActionTypes;
  payload?: payload;
  meta?: any;
  error?: boolean;
};

type State = {
  chats: {
    order: string[];
    map: {
      [chatId: string]: InflatedChat;
    };
  };
  messages: {
    [messageId: string]: ChatMessage;
  };
};

export type InflatedChat = Chat & {
  messages: string[];
  nickname?: string;
};

const initialState: State = {
  chats: {
    order: [],
    map: {},
  },
  messages: {},
};

export const setChats = (chats: {
  [chatId: string]: Chat;
}): Action<{
  [chatId: string]: Chat;
}> => ({
  type: ActionTypes.SET_CHATS,
  payload: chats,
});

const addChat = (chat: Chat): Action<Chat> => ({
  type: ActionTypes.ADD_CHAT,
  payload: chat,
});

const setMessage = (msg: ChatMessage): Action<ChatMessage> => ({
  type: ActionTypes.SET_MESSAGE,
  payload: msg,
});

const setMessagesForChat = (
  chatId: string,
  messages: string[]
): Action<{ chatId: string; messages: string[] }> => ({
  type: ActionTypes.SET_MESSAGES_FOR_CHAT,
  payload: { chatId, messages },
});

export const fetchChats =
  (address: string) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    await zkchat.fetchActiveChats(address);
    dispatch(setChats(zkchat.activeChats));
  };

export const useChatIds = () => {
  return useSelector((state: AppRootState) => {
    return state.chats.chats.order;
  }, deepEqual);
};

function handeSetNickname(state: State, action: Action<{ chat: Chat; nickname: string }>) {
  const chatId = zkchat.deriveChatId(action.payload!.chat);
  const chats = state.chats;
  const { map } = chats;
  const chat = map[chatId];

  if (!chat || chat.nickname === action.payload!.nickname) {
    return state;
  }

  return {
    ...state,
    chats: {
      ...chats,
      map: {
        ...map,
        [chatId]: {
          ...chat,
          nickname: action.payload!.nickname,
        },
      },
    },
  };
}

function handeAddChat(state: State, action: Action<Chat>) {
  const chatId = zkchat.deriveChatId(action.payload!);
  const chats = state.chats;

  const { order, map } = chats;

  if (map[chatId]) {
    return state;
  }

  const newOrder = [...order, chatId];
  const newMap = {
    ...map,
    [chatId]: {
      ...action.payload!,
      messages: [],
    },
  };

  return {
    ...state,
    chats: {
      order: newOrder,
      map: newMap,
    },
  };
}

function handleSetChats(
  state: State,
  action: Action<{
    [chatId: string]: Chat & {
      messages: string[];
    };
  }>
) {
  const chats = action.payload!;
  const order = Object.keys(chats);
  const map = {
    ...chats,
  };

  return {
    ...state,
    chats: {
      order,
      map,
    },
  };
}

function handleSetMessagesForChats(
  state: State,
  action: Action<{
    chatId: string;
    messages: string[];
  }>
) {
  const { chatId, messages } = action.payload!;
  const chat = state.chats.map[chatId];

  if (!chat) return state;

  return {
    ...state,
    chats: {
      ...state.chats,
      map: {
        ...state.chats.map,
        [chatId]: {
          ...chat,
          messages: messages,
        },
      },
    },
  };
}

export const useChatId = (chatId: string) => {
  return useSelector((state: AppRootState) => {
    const chat = state.chats.chats.map[chatId];

    if (!chat) return;

    const { ...rest } = chat;

    return rest;
  }, deepEqual);
};

export const useMessagesByChatId = (chatId: string) => {
  return useSelector((state: AppRootState) => {
    return state.chats.chats.map[chatId]?.messages || [];
  }, deepEqual);
};

export const useLastNMessages = (chatId: string, n = 1): ChatMessage[] => {
  return useSelector((state: AppRootState) => {
    const {
      chats: { messages },
    } = state;
    const ids = state.chats.chats.map[chatId]?.messages || [];
    return ids.slice(0, n).map(messageId => messages[messageId]);
  }, deepEqual);
};

export const useChatMessage = (messageId: string) => {
  return useSelector((state: AppRootState) => {
    return state.chats.messages[messageId];
  }, deepEqual);
};

export default function chats(state = initialState, action: Action<any>): State {
  switch (action.type) {
    case ActionTypes.SET_CHATS:
      return handleSetChats(state, action);
    case ActionTypes.ADD_CHAT:
      return handeAddChat(state, action);
    case ActionTypes.SET_MESSAGES_FOR_CHAT:
      return handleSetMessagesForChats(state, action);
    case ActionTypes.SET_CHAT_NICKNAME:
      return handeSetNickname(state, action);
    case ActionTypes.SET_MESSAGE:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.messageId]: action.payload,
        },
      };
    default:
      return state;
  }
}
