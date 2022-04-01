import {useSelector} from "react-redux";
import {genExternalNullifier, Semaphore,} from '@zk-kit/protocols';
import {Strategy, ZkIdentity} from '@zk-kit/identity'
import {AppRootState} from "../store/configureAppStore";
import deepEqual from "fast-deep-equal";
import {convertToRaw, EditorState} from "draft-js";
import {Dispatch} from "redux";
import {
    Connection,
    ConnectionMessageSubType,
    MessageType,
    Moderation,
    ModerationMessageSubType,
    Post,
    PostMessageSubType,
    Profile,
    ProfileMessageSubType
} from "../util/message";
import gun from "../util/gun";
import {ThunkDispatch} from "redux-thunk";
import {markdownConvertOptions} from "../components/DraftEditor";
import config from "../util/config";
import {setBlocked, setFollowed} from "./users";
import {updateStatus} from "../util/twitter";
import {checkPath} from "../util/interrep";
import {setBlockedPost} from "./posts";

const { draftToMarkdown } = require('markdown-draft-js');

export enum ActionTypes {
    SET_DRAFT = 'drafts/setDraft',
    SET_MODERATION = 'drafts/setModeration',
    SET_ATTACHMENT = 'drafts/setAttachment',
    SET_SUBMITTING = 'drafts/setSubmitting',
    SET_MIRROR = 'drafts/setMirror',
    SET_GLOBAL = 'drafts/setGloabl',
}

type Action<payload> = {
    type: ActionTypes;
    payload?: payload;
    meta?: any;
    error?: boolean;
}

type State = {
    submitting: boolean;
    mirror: boolean;
    map: {
        [replyId: string]: Draft;
    }
}

type Draft = {
    attachment?: string;
    moderation?: ModerationMessageSubType | null;
    reference: string;
    global?: boolean;
    editorState: EditorState;
}

export const initialState: State = {
    submitting: false,
    mirror: false,
    map: {},
};

export const setDraft = (draft: Draft): Action<Draft> => {
    return {
        type: ActionTypes.SET_DRAFT,
        payload: draft,
    };
}

export const setModeration = (messageId: string, moderation: ModerationMessageSubType | null): Action<{
    messageId: string;
    moderation: ModerationMessageSubType | null;
}> => {
    return {
        type: ActionTypes.SET_MODERATION,
        payload: {
            messageId,
            moderation,
        },
    };
}

export const setGloabl = (messageId: string, global: boolean): Action<{
    messageId: string;
    global: boolean;
}> => {
    return {
        type: ActionTypes.SET_GLOBAL,
        payload: {
            messageId,
            global,
        },
    };
}

export const emptyDraft = (reference?: string): Action<Draft> => ({
    type: ActionTypes.SET_DRAFT,
    payload: {
        editorState: EditorState.createEmpty(),
        reference: reference || '',
        attachment: '',
        global: false,
    },
})

export const submitSemaphorePost = (post: Post) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const {
        selected,
    } = state.worker;

    if (selected?.type !== 'interrep') throw new Error('Not in incognito mode');

    const zkIdentity = new ZkIdentity(Strategy.SERIALIZED, selected.serializedIdentity);
    const identityTrapdoor = zkIdentity.getTrapdoor();
    const identityNullifier = zkIdentity.getNullifier();
    const identityCommitment = selected.identityCommitment;
    const data: any = await checkPath(identityCommitment);

    const identityPathElements = data?.path?.path_elements;
    const identityPathIndex = data?.path?.path_index;
    const root = data?.path?.root;

    if (!identityCommitment || !identityPathElements || !identityPathIndex || !identityTrapdoor || !identityNullifier) {
        return null;
    }

    const {
        messageId,
        hash,
        ...json
    } = post.toJSON();

    const externalNullifier = genExternalNullifier('POST');
    const wasmFilePath = `${config.indexerAPI}/dev/semaphore_wasm`;
    const finalZkeyPath = `${config.indexerAPI}/dev/semaphore_final_zkey`;

    const witness = Semaphore.genWitness(
        identityTrapdoor,
        identityNullifier,
        {
            root: root,
            leaf: BigInt(identityCommitment),
            pathIndices: identityPathIndex,
            siblings: identityPathElements,
        },
        externalNullifier,
        hash,
    );

    const {
        proof,
        publicSignals,
    } = await Semaphore.genProof(witness, wasmFilePath, finalZkeyPath);

    try {
        // @ts-ignore
        const semaphorePost: any = {
            ...json,
            proof: JSON.stringify(proof),
            publicSignals: JSON.stringify(publicSignals),
        };

        // @ts-ignore
        await gun.get('message')
            .get(messageId)
            // @ts-ignore
            .put(semaphorePost);

        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });

        dispatch(emptyDraft(post.payload.reference));
    } catch (e) {
        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });
        throw e;
    }

}

export const submitZKPRPost = (post: Post) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const {
        selected,
    } = state.worker;
    const { zkpr } = state.zkpr;

    if (selected?.type !== 'zkpr_interrep') throw new Error('Not in incognito mode');

    const identityCommitment = selected.identityCommitment;
    const data: any = await checkPath(identityCommitment);
    const identityPathElements = data.path.path_elements;
    const identityPathIndex = data.path.path_index;
    const root = data.path.root;

    if (!identityCommitment || !identityPathElements || !identityPathIndex || !zkpr) {
        return null;
    }

    const {
        messageId,
        hash,
        ...json
    } = post.toJSON();

    const externalNullifier = genExternalNullifier('POST');
    const wasmFilePath = `${config.indexerAPI}/dev/semaphore_wasm`;
    const finalZkeyPath = `${config.indexerAPI}/dev/semaphore_final_zkey`;

    const { fullProof } = await zkpr.semaphoreProof(
        externalNullifier,
        hash,
        wasmFilePath,
        finalZkeyPath,
        '',
        {
            root: root.toString(),
            leaf: identityCommitment,
            siblings: identityPathElements.map((d: BigInt) => d.toString()),
            pathIndices: identityPathIndex,
        }
    )

    const {
        proof,
        publicSignals,
    } = fullProof;

    try {
        // @ts-ignore
        const semaphorePost: any = {
            ...json,
            proof: JSON.stringify(proof),
            publicSignals: JSON.stringify(publicSignals),
        };

        // @ts-ignore
        await gun.get('message')
            .get(messageId)
            // @ts-ignore
            .put(semaphorePost);

        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });

        dispatch(emptyDraft(post.payload.reference));
    } catch (e) {
        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });
        throw e;
    }

}

export const submitPost = (reference = '') => async (dispatch: ThunkDispatch<any, any, any>, getState: () => AppRootState) => {
    dispatch({
        type: ActionTypes.SET_SUBMITTING,
        payload: true,
    });

    const { drafts, web3, worker, posts } = getState();
    const draft = drafts.map[reference];
    const shouldMirror = drafts.mirror;
    const {
        semaphore,
    } = web3;

    const {
        selected,
    } = worker;

    const account = selected?.address;

    if (!draft) return;

    try {
        const currentContent = draft.editorState.getCurrentContent();
        const markdown = draftToMarkdown(convertToRaw(currentContent), markdownConvertOptions);

        const maxlen = shouldMirror ? 280 : 500;

        if (markdown.length > maxlen) throw new Error(`post cannot be over ${maxlen} characters`);

        const referencePost = posts.map[reference];
        let subtype: PostMessageSubType = PostMessageSubType.Default;
        let tweetUrl = '';
        let replyToTweetId;
        let replyToUsername;

        if (shouldMirror) {
            subtype = reference ? PostMessageSubType.MirrorReply : PostMessageSubType.MirrorPost;

            if ([PostMessageSubType.MirrorPost, PostMessageSubType.MirrorReply].includes(referencePost?.subtype)) {
                const [tweetUsername, _, tweetId] = referencePost?.payload.topic
                    .replace('https://twitter.com/', '')
                    .split('/');
                replyToTweetId = tweetId;
                replyToUsername = tweetUsername;
            }

            const tweetStatus = replyToTweetId
                ? `@${replyToUsername} ${markdown}`
                : markdown;

            tweetUrl = await updateStatus(tweetStatus, replyToTweetId);
        } else if (reference) {
            subtype = PostMessageSubType.Reply;
        }

        const post = new Post({
            type: MessageType.Post,
            subtype: subtype,
            creator: selected?.type === 'interrep' ? '' : account,
            payload: {
                topic: tweetUrl,
                content: markdown,
                reference: reference,
                attachment: draft.attachment,
            },
        });

        if (selected?.type === 'interrep') {
            await dispatch(submitSemaphorePost(post));
            return post;
        } else if (selected?.type === 'zkpr_interrep') {
            await dispatch(submitZKPRPost(post));
            return post;
        }

        // @ts-ignore
        if (!gun.user().is) if (!gun.user().is) throw new Error('not logged in');

        const {
            messageId,
            hash,
            ...json
        } = await post.toJSON();

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

        dispatch(emptyDraft(reference));

        if (draft.moderation) {
            await dispatch(submitModeration(messageId, draft.moderation));
        }

        if (draft.global) {
            await dispatch(submitModeration(messageId, ModerationMessageSubType.Global));
        }

        return post;
    } catch (e) {
        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });
        throw e;
    }
}

export const submitRepost = (reference = '') => async (dispatch: Dispatch, getState: () => AppRootState) => {
    dispatch({
        type: ActionTypes.SET_SUBMITTING,
        payload: true,
    });

    const { web3, worker } = getState();

    const {
        selected,
    } = worker;

    const account = selected?.address;

    try {
        // @ts-ignore
        if (!gun.user().is) throw new Error('not logged in');

        const post = new Post({
            type: MessageType.Post,
            subtype: PostMessageSubType.Repost,
            creator: account,
            payload: {
                reference: reference,
            },
        });

        const {
            messageId,
            hash,
            ...json
        } = await post.toJSON();

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

        dispatch(emptyDraft(reference));

        return post;
    } catch (e) {
        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });
        throw e;
    }
}

export const submitModeration = (reference = '', subtype: ModerationMessageSubType) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    dispatch({
        type: ActionTypes.SET_SUBMITTING,
        payload: true,
    });

    const { web3, worker } = getState();

    const {
        selected,
    } = worker;

    const account = selected?.address;

    try {
        // @ts-ignore
        if (!gun.user().is) throw new Error('not logged in');

        const moderation = new Moderation({
            type: MessageType.Moderation,
            subtype: subtype,
            creator: account,
            payload: {
                reference: reference,
            },
        });

        const {
            messageId,
            hash,
            ...json
        } = await moderation.toJSON();

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

        if (moderation.subtype === ModerationMessageSubType.Block) {
            dispatch(setBlockedPost(reference, messageId));
        }

        return moderation;
    } catch (e) {
        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });
        throw e;
    }
}


export const submitConnection = (name: string, subtype: ConnectionMessageSubType) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const { web3, worker } = getState();

    const {
        selected,
    } = worker;

    const account = selected?.address;
    const gunUser = gun.user();

    try {
        // @ts-ignore
        if (!gun.user().is) throw new Error('not logged in');

        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: true,
        });

        const connection = new Connection({
            type: MessageType.Connection,
            subtype: subtype,
            creator: account,
            payload: {
                name: name,
            },
        });

        const {
            messageId,
            hash,
            ...json
        } = await connection.toJSON();

        // @ts-ignore
        await gunUser
            .get('message')
            .get(messageId)
            // @ts-ignore
            .put(json);

        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });

        if (connection.subtype === ConnectionMessageSubType.Follow) {
            dispatch(setFollowed(connection.payload.name, messageId));
        } else if (connection.subtype === ConnectionMessageSubType.Block) {
            dispatch(setBlocked(connection.payload.name, messageId));
        }

        return connection;
    } catch (e) {
        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });
        throw e;
    }
}

export const submitProfile = (
    subtype: ProfileMessageSubType,
    value: string,
    key?: string,
) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    dispatch({
        type: ActionTypes.SET_SUBMITTING,
        payload: true,
    });

    const { web3, worker } = getState();

    const {
        selected,
    } = worker;

    const account = selected?.address;

    try {
        // @ts-ignore
        if (!gun.user().is) throw new Error('not logged in');

        const post = new Profile({
            type: MessageType.Profile,
            subtype: subtype,
            creator: account,
            payload: {
                key: key || '',
                value: value,
            },
        });

        const {
            messageId,
            hash,
            ...json
        } = await post.toJSON();

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

        return post;
    } catch (e) {
        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });
        throw e;
    }
}

export const removeMessage = (messageId: string) => async (dispatch: Dispatch) => {
    // @ts-ignore
    if (!gun.user().is) throw new Error('not logged in');

    // @ts-ignore
    await gun.user()
        .get('message')
        .get(messageId)
        // @ts-ignore
        .put(null);
}

export const setMirror = (mirror: boolean): Action<boolean> => ({
    type: ActionTypes.SET_MIRROR,
    payload: mirror,
});

export const useDraft = (reference = ''): Draft => {
    return useSelector((state: AppRootState) => {
        const draft = state.drafts.map[reference];

        return draft
            ? draft
            : {
                global: false,
                reference,
                editorState: EditorState.createEmpty(),
            };
    }, deepEqual);
}

export const useSubmitting = (): boolean => {
    return useSelector((state: AppRootState) => {
        return state.drafts.submitting;
    }, deepEqual);
}

export const useMirror = (): boolean => {
    return useSelector((state: AppRootState) => {
        return state.drafts.mirror;
    }, deepEqual);
}

export default function drafts(state = initialState, action: Action<any>): State {
    switch (action.type) {
        case ActionTypes.SET_DRAFT:
            return {
                ...state,
                map: {
                    ...state.map,
                    [action.payload.reference || '']: action.payload,
                },
            };
        case ActionTypes.SET_MODERATION:
            return {
                ...state,
                map: {
                    ...state.map,
                    [action.payload.messageId || '']: {
                        ...state.map[action.payload.messageId || ''],
                        moderation: action.payload.moderation,
                    },
                },
            };
        case ActionTypes.SET_GLOBAL:
            return {
                ...state,
                map: {
                    ...state.map,
                    [action.payload.messageId || '']: {
                        ...state.map[action.payload.messageId || ''],
                        global: action.payload.global,
                    },
                },
            };
        case ActionTypes.SET_SUBMITTING:
            return {
                ...state,
                submitting: action.payload,
            };
        case ActionTypes.SET_MIRROR:
            return {
                ...state,
                mirror: action.payload,
            };
        default:
            return state;
    }
}