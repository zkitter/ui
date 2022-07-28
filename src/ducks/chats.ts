import {ZKPR} from "./zkpr";
import {Chat, ChatMessage, ZKChatClient} from "../util/zkchat";
import {Dispatch} from "redux";
import store, {AppRootState} from "../store/configureAppStore";
import config from "../util/config";
import {useSelector} from "react-redux";
import deepEqual from "fast-deep-equal";
const EVENTS = ZKChatClient.EVENTS;

export const zkchat = new ZKChatClient({
    api: `${config.indexerAPI}/v1/zkchat`,
});


zkchat.on(EVENTS.MESSAGE_APPENDED, (message: ChatMessage) => {
     store.dispatch(setMessage(message));
});

zkchat.on(EVENTS.MESSAGE_PREPENDED, (message: ChatMessage) => {
     store.dispatch(setMessage(message));
});

zkchat.on(EVENTS.CHAT_CREATED, (chat: Chat) => {
     store.dispatch(addChat(chat));
});

enum ActionTypes {
    SET_CHATS = 'chats/setChats',
    ADD_CHAT = 'chats/addChat',
    SET_CHAT_NICKNAME = 'chats/setChatNickname',
    SET_MESSAGE = 'chats/SET_MESSAGE',
}

type Action<payload> = {
    type: ActionTypes;
    payload?: payload;
    meta?: any;
    error?: boolean;
}

type State = {
    chats: {
        order: string[];
        map: {
            [chatId: string]: InflatedChat;
        };
    };
    messages:  {
        [messageId: string]: ChatMessage;
    };
}

export type InflatedChat = Chat & {
    messages: string[];
    nickname?: string;
}

const initialState: State = {
    chats: {
        order: [],
        map: {},
    },
    messages: {},
};

const setChats = (chats: {
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

const setNickname = (chat: Chat, nickname: string): Action<{
    chat: Chat,
    nickname: string,
}> => ({
    type: ActionTypes.SET_CHAT_NICKNAME,
    payload: {chat, nickname},
});

const setMessage = (msg: ChatMessage): Action<ChatMessage> => ({
    type: ActionTypes.SET_MESSAGE,
    payload: msg,
});

export const fetchChats = (address: string) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    await zkchat.fetchActiveChats(address);
    dispatch(setChats(zkchat.activeChats));
}

export default function chats(state = initialState, action: Action<any>): State {
    switch (action.type) {
        case ActionTypes.SET_CHATS:
            return handleSetChats(state, action);
        case ActionTypes.ADD_CHAT:
            return handeAddChat(state, action);
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

function handeSetNickname(state: State, action: Action<{ chat: Chat, nickname: string }>) {
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
    }
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
    }
}

function handleSetChats(state: State, action: Action<{
    [chatId: string]: Chat & {
        messages: string[];
    };
}>) {
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
    }
}

export const useChatIds = () => {
    return useSelector((state: AppRootState) => {
        return state.chats.chats.order;
    }, deepEqual);
}

export const useChatId = (chatId: string) => {
    return useSelector((state: AppRootState) => {
        return state.chats.chats.map[chatId];
    }, deepEqual);
}

export const useChatMessage = (messageId: string) => {
    return useSelector((state: AppRootState) => {
        return state.chats.messages[messageId];
    }, deepEqual);
}