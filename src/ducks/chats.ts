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
    SET_MESSAGE = 'chats/SET_MESSAGE',
}

type Action<payload> = {
    type: ActionTypes;
    payload?: payload;
    meta?: any;
    error?: boolean;
}

type State = {
    chats: Chat[];
    messages:  {
        [messageId: string]: ChatMessage;
    };
}

const initialState: State = {
    chats: [],
    messages: {},
};

const setChats = (chats: Chat[]): Action<Chat[]> => ({
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

export const fetchChats = (address: string) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    await zkchat.fetchActiveChats(address);
    dispatch(setChats(zkchat.activeChats));
}

export default function chats(state = initialState, action: Action<any>): State {
    switch (action.type) {
        case ActionTypes.SET_CHATS:
            return {
                ...state,
                chats: action.payload,
            };
        case ActionTypes.ADD_CHAT:
            return {
                ...state,
                chats: [...state.chats, action.payload],
            };
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

export const useChats = () => {
    return useSelector((state: AppRootState) => {
        return state.chats.chats;
    }, deepEqual);
}

export const useChatMessage = (messageId: string) => {
    return useSelector((state: AppRootState) => {
        return state.chats.messages[messageId];
    }, deepEqual);
}