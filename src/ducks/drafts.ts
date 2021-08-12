import {useSelector} from "react-redux";
import {AppRootState} from "../store/configureAppStore";
import deepEqual from "fast-deep-equal";
import {User} from "./users";
import {convertFromRaw, convertToRaw, EditorState} from "draft-js";
const { markdownToDraft, draftToMarkdown } = require('markdown-draft-js');
import {markdownConvertOptions} from "../components/Editor";
import {Dispatch} from "redux";
import {MessageType, Post, PostMessageSubType} from "../util/message";
import gun from "../util/gun";

enum ActionTypes {
    SET_DRAFT = 'drafts/setDraft',
    SET_SUBMITTING = 'drafts/setSubmitting',
}

type Action = {
    type: ActionTypes;
    payload?: any;
    meta?: any;
    error?: boolean;
}

type State = {
    submitting: boolean;
    map: {
        [replyId: string]: Draft;
    }
}

type Draft = {
    reference: string;
    editorState: EditorState;
}

const initialState: State = {
    submitting: false,
    map: {},
};

export const setDraft = (editorState: EditorState, reference = '') => {
    return {
        type: ActionTypes.SET_DRAFT,
        payload: {
            editorState,
            reference,
        },
    };
}

export const submitPost = (reference = '') => async (dispatch: Dispatch, getState: () => AppRootState) => {
    dispatch({
        type: ActionTypes.SET_SUBMITTING,
        payload: true,
    });

    const { drafts, web3 } = getState();
    const draft = drafts.map[reference];
    const {
        ensName,
    } = web3;

    if (!draft) return;

    const currentContent = draft.editorState.getCurrentContent();
    const markdown = draftToMarkdown(convertToRaw(currentContent), markdownConvertOptions);

    const post = new Post({
        type: MessageType.Post,
        subtype: PostMessageSubType.Default,
        creator: ensName,
        payload: {
            content: markdown,
            reference: reference,
        },
    });

    const {
        messageId,
        hash,
        ...json
    } = await post.toJSON();

    try {
        // @ts-ignore
        await gun.user()
            .get('message')
            .get(messageId)
            // @ts-ignore
            .put(json);

        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });

        dispatch(setDraft(EditorState.createEmpty(), reference));
    } catch (e) {
        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });
        throw e;
    }
}

export const useDraft = (reference = ''): Draft => {
    return useSelector((state: AppRootState) => {
        const draft = state.drafts.map[reference];

        return draft
            ? draft
            : {
                reference,
                editorState: EditorState.createEmpty(),
            };
    }, deepEqual);
}

export default function drafts(state = initialState, action: Action): State {
    switch (action.type) {
        case ActionTypes.SET_DRAFT:
            return {
                ...state,
                map: {
                    ...state.map,
                    [action.payload.reference || '']: action.payload,
                },
            };
        default:
            return state;
    }
}