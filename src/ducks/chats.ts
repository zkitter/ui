import { Chat, ChatMessage, ZKChatClient } from '../util/zkchat';
import { Dispatch } from 'redux';
import store, { AppRootState } from '../store/configureAppStore';
import config from '../util/config';
import { useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import sse from '../util/sse';
const EVENTS = ZKChatClient.EVENTS;

export const zkchat = new ZKChatClient({
  api: `${config.indexerAPI}/v1/zkchat`,
});

sse.on('NEW_CHAT_MESSAGE', async (payload: any) => {
  const message = await zkchat.inflateMessage(payload);
  zkchat.prependMessage(message);
  const chat: Chat = {
    type: 'DIRECT',
    receiver: '',
    receiverECDH: message.receiver.ecdh!,
    senderECDH: message.sender.ecdh!,
    senderHash: message.sender.hash,
  };
  const chatId = zkchat.deriveChatId(chat);
  // @ts-ignore
  store.dispatch(incrementUnreadForChatId(chatId));
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
zkchat.on(EVENTS.IDENTITY_CHANGED, () => {
  store.dispatch(setChats(zkchat.activeChats));
});

enum ActionTypes {
  SET_CHATS = 'chats/setChats',
  SET_MESSAGES_FOR_CHAT = 'chats/setMessagesForChat',
  ADD_CHAT = 'chats/addChat',
  SET_CHAT_NICKNAME = 'chats/setChatNickname',
  SET_MESSAGE = 'chats/SET_MESSAGE',
  SET_UNREAD = 'chats/SET_UNREAD',
}

type Action<payload> = {
  type: ActionTypes;
  payload: payload;
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
  unreads: {
    [chatId: string]: number;
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
  unreads: {},
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

const setNickname = (
  chat: Chat,
  nickname: string
): Action<{
  chat: Chat;
  nickname: string;
}> => ({
  type: ActionTypes.SET_CHAT_NICKNAME,
  payload: { chat, nickname },
});

const setMessage = (msg: ChatMessage): Action<ChatMessage> => ({
  type: ActionTypes.SET_MESSAGE,
  payload: msg,
});

const setUnread = (
  chatId: string,
  unreads: number
): Action<{ chatId: string; unreads: number }> => ({
  type: ActionTypes.SET_UNREAD,
  payload: { chatId, unreads },
});

const setMessagesForChat = (
  chatId: string,
  messages: string[]
): Action<{ chatId: string; messages: string[] }> => ({
  type: ActionTypes.SET_MESSAGES_FOR_CHAT,
  payload: { chatId, messages },
});

export const setLastReadForChatId =
  (chatId: string) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const {
      chats: {
        chats: { map },
      },
    } = getState();

    const chat = map[chatId];

    if (!zkchat.identity || !chat) return;

    const res = await fetch(
      `${config.indexerAPI}/v1/lastread/${zkchat.identity.ecdh.pub}/${chat.receiverECDH}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastread: Date.now(),
        }),
      }
    );
    const json = await res.json();

    if (json.error) {
      throw new Error(json.payload);
    }

    dispatch(setUnread(chatId, 0));
  };

export const fetchChats = (address: string) => async (dispatch: Dispatch) => {
  await zkchat.fetchActiveChats(address);
  dispatch(setChats(zkchat.activeChats));
};

export const fetchUnreads = () => async (dispatch: Dispatch, getState: () => AppRootState) => {
  for (const chat of Object.values(zkchat.activeChats)) {
    const { senderECDH, receiverECDH } = chat || {};
    const chatId = zkchat.deriveChatId(chat);
    const resp = await fetch(
      `${config.indexerAPI}/v1/zkchat/chat-messages/dm/${receiverECDH}/${senderECDH}/unread`
    );
    const json = await resp.json();
    if (!json.error) {
      dispatch(setUnread(chatId, json.payload));
    }
  }
};

export const incrementUnreadForChatId =
  (chatId: string) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const {
      chats: { unreads },
    } = getState();
    dispatch(setUnread(chatId, (unreads[chatId] || 0) + 1));
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
    case ActionTypes.SET_UNREAD:
      return handleSetUnread(state, action);
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

function handleSetUnread(state: State, action: Action<{ chatId: string; unreads: number }>): State {
  const { chatId, unreads } = action.payload;
  const { chats } = state;

  return {
    ...state,
    chats: {
      ...chats,
      order: unreads ? [chatId].concat(chats.order.filter(id => id !== chatId)) : chats.order,
    },
    unreads: {
      ...state.unreads,
      [chatId]: unreads,
    },
  };
}

export const useChatIds = () => {
  return useSelector((state: AppRootState) => {
    const {
      chats: {
        chats: { order },
      },
    } = state;
    return order;
  }, deepEqual);
};

export const useChatId = (chatId: string) => {
  return useSelector((state: AppRootState) => {
    const chat = state.chats.chats.map[chatId];

    if (!chat) return;

    const { messages, nickname, ...rest } = chat;

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
      chats: {
        chats: { map },
        messages,
      },
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

export const useUnreadChatMessagesAll = () => {
  return useSelector((state: AppRootState) => {
    const {
      chats: { order },
      unreads,
    } = state.chats;
    return order.reduce((sum, id) => (sum += unreads[id] || 0), 0);
  }, deepEqual);
};

export const useUnreadChatMessages = (chatId: string) => {
  return useSelector((state: AppRootState) => {
    return state.chats.unreads[chatId] || 0;
  }, deepEqual);
};
