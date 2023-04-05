import { Dispatch } from 'redux';
import store, { AppRootState } from '../store/configureAppStore';
import { useSelector } from 'react-redux';
import deepEqual from 'fast-deep-equal';
import { Chat as ChatMessage, Zkitter } from 'zkitter-js';
import { ChatMeta } from 'zkitter-js/dist/src/models/chats';
import { ZkIdentity } from '@zk-kit/identity';
import { deserializeZKIdentity } from '~/zk';
import { hexify } from '~/format';
import { waitForSync } from '@ducks/zkitter';
import { getZKGroupFromIdentity } from '@ducks/worker';

// sse.on('NEW_CHAT_MESSAGE', async (payload: any) => {
//   const message = await zkchat.inflateMessage(payload);
//   zkchat.prependMessage(message);
//   const chat: Chat = {
//     type: 'DIRECT',
//     receiver: '',
//     receiverECDH: message.receiver.ecdh!,
//     senderECDH: message.sender.ecdh!,
//     senderHash: message.sender.hash,
//   };
//   const chatId = zkchat.deriveChatId(chat);
//   // @ts-ignore
//   store.dispatch(incrementUnreadForChatId(chatId));
// });

const onNewMessage = (message: any) => {
  // const { receiver, sender } = message;
  // const chatId = zkchat.deriveChatId({
  //   type: 'DIRECT',
  //   receiver: '',
  //   receiverECDH: receiver.ecdh!,
  //   senderECDH: sender.ecdh!,
  // });
  // store.dispatch(setMessage(message));
  // store.dispatch(setMessagesForChat(chatId, zkchat.activeChats[chatId].messages));
};

enum ActionTypes {
  SET_CHATS = 'chats/setChats',
  SET_MESSAGES_FOR_CHAT = 'chats/setMessagesForChat',
  PREPEND_MESSAGES_FOR_CHAT = 'chats/prependMessagesForChat',
  ADD_CHAT = 'chats/addChat',
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

export type InflatedChat = ChatMeta & {
  messages: string[];
};

const initialState: State = {
  unreads: {},
  chats: {
    order: [],
    map: {},
  },
  messages: {},
};

export const setChats = (chats: ChatMeta[]): Action<ChatMeta[]> => ({
  type: ActionTypes.SET_CHATS,
  payload: chats,
});

export const addChat = (chat: ChatMeta): Action<ChatMeta> => ({
  type: ActionTypes.ADD_CHAT,
  payload: chat,
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
  messages: ChatMessage[]
): Action<{ chatId: string; messages: ChatMessage[] }> => ({
  type: ActionTypes.SET_MESSAGES_FOR_CHAT,
  payload: { chatId, messages },
});

export const prependMessagesForChat = (
  chatId: string,
  messages: ChatMessage[]
): Action<{ chatId: string; messages: ChatMessage[] }> => ({
  type: ActionTypes.PREPEND_MESSAGES_FOR_CHAT,
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

    // if (!zkchat.identity || !chat) return;
    if (!chat) return;

    // const res = await fetch(
    //   `${config.indexerAPI}/v1/lastread/${zkchat.identity.ecdh.pub}/${chat.receiverECDH}`,
    //   {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       lastread: Date.now(),
    //     }),
    //   }
    // );
    // const json = await res.json();
    //
    // if (json.error) {
    //   throw new Error(json.payload);
    // }

    dispatch(setUnread(chatId, 0));
  };

export const fetchChats = () => async (dispatch: Dispatch, getState: () => AppRootState) => {
  const {
    zkitter: { client },
    worker: { selected },
  } = getState();

  let zkitterClient = client || (await waitForSync);

  let addressOrIdcommitment = '';

  if (selected?.type === 'gun') addressOrIdcommitment = selected.address;
  if (selected?.type === 'interrep') {
    addressOrIdcommitment = hexify(
      deserializeZKIdentity(selected.serializedIdentity)!.genIdentityCommitment()
    );
  }
  if (selected?.type === 'taz') {
    addressOrIdcommitment = hexify(
      deserializeZKIdentity(selected.serializedIdentity)!.genIdentityCommitment()
    );
  }

  const chatMetas: ChatMeta[] = await zkitterClient.getChatByUser(addressOrIdcommitment);

  dispatch(setChats(chatMetas));
  zkitterClient.updateFilter({
    ecdh: [
      ...chatMetas.map(({ senderECDH }) => senderECDH),
      ...chatMetas.map(({ receiverECDH }) => receiverECDH),
    ],
  });
};

export const fetchChatMessages =
  (chatId: string, limit = 50, offset?: string) =>
  async (dispatch: Dispatch, getState: () => AppRootState) => {
    const {
      zkitter: { client },
      worker: { selected },
    } = getState();

    const zkitterClient: Zkitter = client || (await waitForSync);

    let messages: ChatMessage[] = [];

    if (selected?.type === 'gun') {
      messages = await zkitterClient.getChatMessages(chatId, limit, offset, {
        type: 'ecdsa',
        address: selected.address,
        privateKey: selected.privateKey,
      });
    } else if (selected?.type === 'taz' || selected?.type === 'interrep') {
      const zkIdentity = deserializeZKIdentity(selected.serializedIdentity)!;
      messages = await zkitterClient.getChatMessages(chatId, limit, offset, {
        type: 'zk',
        zkIdentity,
        groupId: getZKGroupFromIdentity(selected),
      });
    }

    if (messages.length) {
      dispatch(setMessagesForChat(chatId, messages));
    }
  };

export const fetchUnreads = () => async (dispatch: Dispatch, getState: () => AppRootState) => {
  // for (const chat of Object.values(zkchat.activeChats)) {
  //   const { senderECDH, receiverECDH } = chat || {};
  //   const chatId = zkchat.deriveChatId(chat);
  //   const resp = await fetch(
  //     `${config.indexerAPI}/v1/zkchat/chat-messages/dm/${receiverECDH}/${senderECDH}/unread`
  //   );
  //   const json = await resp.json();
  //   if (!json.error) {
  //     dispatch(setUnread(chatId, json.payload));
  //   }
  // }
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
      return handleAddChat(state, action);
    case ActionTypes.SET_MESSAGES_FOR_CHAT:
      return handleSetMessagesForChats(state, action);
    case ActionTypes.PREPEND_MESSAGES_FOR_CHAT:
      return handlePrependMessagesForChats(state, action);
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

function handleAddChat(state: State, action: Action<ChatMeta>) {
  const chatId = action.payload!.chatId;
  const chats = state.chats;

  const { order, map } = chats;

  if (map[chatId]) {
    return state;
  }

  const newOrder = [...order, chatId];
  const newMap = {
    ...map,
    [chatId]: {
      ...action.payload,
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

function handleSetChats(state: State, action: Action<ChatMeta[]>) {
  const chats = action.payload!;
  const order = chats.map(({ chatId }) => chatId);
  const map = chats.reduce((acc: { [chatId: string]: InflatedChat }, chat: ChatMeta) => {
    acc[chat.chatId] = {
      ...chat,
      messages: [],
    };
    return acc;
  }, {});

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
    messages: ChatMessage[];
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
          messages: messages.map(chat => chat.toJSON().messageId),
        },
      },
    },
    messages: {
      ...state.messages,
      ...messages.reduce((acc: { [messageId: string]: ChatMessage }, msg: ChatMessage) => {
        acc[msg.toJSON().messageId] = msg;
        return acc;
      }, {}),
    },
  };
}

function handlePrependMessagesForChats(
  state: State,
  action: Action<{
    chatId: string;
    messages: ChatMessage[];
  }>
) {
  const { chatId, messages } = action.payload!;
  const chat = state.chats.map[chatId];

  if (!chat) return state;

  const newMessages = {
    ...state.messages,
    ...messages.reduce((acc: { [messageId: string]: ChatMessage }, msg: ChatMessage) => {
      acc[msg.toJSON().messageId] = msg;
      return acc;
    }, {}),
  };

  return {
    ...state,
    chats: {
      ...state.chats,
      map: {
        ...state.chats.map,
        [chatId]: {
          ...chat,
          messages: messages
            .map(chat => chat.toJSON().messageId)
            .filter(id => !state.messages[id])
            .concat(chat.messages),
        },
      },
    },
    messages: newMessages,
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

export const useChatId = (chatId: string): ChatMeta | null => {
  return useSelector((state: AppRootState) => {
    const selected = state.worker.selected;
    const chat = state.chats.chats.map[chatId];

    if (!chat) return null;

    const { senderECDH, senderSeed, receiverECDH, type } = chat;

    if (selected?.type === 'gun') {
      const me = state.users.map[selected.address];
      const recipientECDH = me.ecdh === senderECDH ? receiverECDH : senderECDH;

      return {
        type,
        chatId,
        senderECDH: me.ecdh,
        senderSeed: me.ecdh === senderECDH ? senderSeed : '',
        receiverECDH: recipientECDH,
      };
    }

    return {
      type,
      chatId,
      senderECDH,
      senderSeed,
      receiverECDH,
    };
  }, deepEqual);
};

export const useMessagesByChatId = (chatId: string): string[] => {
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
    const ids = map[chatId]?.messages || [];
    return ids.slice(0, n).map(messageId => messages[messageId]);
  }, deepEqual);
};

export const useChatMessage = (messageId: string): ChatMessage | null => {
  return useSelector((state: AppRootState) => {
    return state.chats.messages[messageId] || null;
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
