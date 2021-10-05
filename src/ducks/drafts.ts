import {useSelector} from "react-redux";
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
    PostMessageSubType, Profile,
    ProfileMessageSubType
} from "../util/message";
import gun from "../util/gun";
import {
    OrdinarySemaphore
} from "semaphore-lib";

OrdinarySemaphore.setHasher('poseidon');

import {ThunkDispatch} from "redux-thunk";
import {markdownConvertOptions} from "../components/DraftEditor";
import config from "../util/config";
import {Identity} from "libsemaphore";
const { draftToMarkdown } = require('markdown-draft-js');

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

const vKey = {
    "protocol": "groth16",
    "curve": "bn128",
    "nPublic": 4,
    "vk_alpha_1": [
        "20491192805390485299153009773594534940189261866228447918068658471970481763042",
        "9383485363053290200918347156157836566562967994039712273449902621266178545958",
        "1"
    ],
    "vk_beta_2": [
        [
            "6375614351688725206403948262868962793625744043794305715222011528459656738731",
            "4252822878758300859123897981450591353533073413197771768651442665752259397132"
        ],
        [
            "10505242626370262277552901082094356697409835680220590971873171140371331206856",
            "21847035105528745403288232691147584728191162732299865338377159692350059136679"
        ],
        [
            "1",
            "0"
        ]
    ],
    "vk_gamma_2": [
        [
            "10857046999023057135944570762232829481370756359578518086990519993285655852781",
            "11559732032986387107991004021392285783925812861821192530917403151452391805634"
        ],
        [
            "8495653923123431417604973247489272438418190587263600148770280649306958101930",
            "4082367875863433681332203403145435568316851327593401208105741076214120093531"
        ],
        [
            "1",
            "0"
        ]
    ],
    "vk_delta_2": [
        [
            "350352993197619142271787954816016866685405827145529211099129960138333895351",
            "11259417273060665485033625570096279630738839231801621733208112409472659750706"
        ],
        [
            "6581027027803678033105995881266700971824953327966093737311320327413957537796",
            "17705084644100501057686354131121309200871133134166541010282709611570760160116"
        ],
        [
            "1",
            "0"
        ]
    ],
    "vk_alphabeta_12": [
        [
            [
                "2029413683389138792403550203267699914886160938906632433982220835551125967885",
                "21072700047562757817161031222997517981543347628379360635925549008442030252106"
            ],
            [
                "5940354580057074848093997050200682056184807770593307860589430076672439820312",
                "12156638873931618554171829126792193045421052652279363021382169897324752428276"
            ],
            [
                "7898200236362823042373859371574133993780991612861777490112507062703164551277",
                "7074218545237549455313236346927434013100842096812539264420499035217050630853"
            ]
        ],
        [
            [
                "7077479683546002997211712695946002074877511277312570035766170199895071832130",
                "10093483419865920389913245021038182291233451549023025229112148274109565435465"
            ],
            [
                "4595479056700221319381530156280926371456704509942304414423590385166031118820",
                "19831328484489333784475432780421641293929726139240675179672856274388269393268"
            ],
            [
                "11934129596455521040620786944827826205713621633706285934057045369193958244500",
                "8037395052364110730298837004334506829870972346962140206007064471173334027475"
            ]
        ]
    ],
    "IC": [
        [
            "11980259404895261761475782449845098746338182978185870241217917563913897485030",
            "10855856319717038155137836614255336046969377968036737096070988058561370449327",
            "1"
        ],
        [
            "14016714963931972139399068725852416229022307538817052195756308271612868452344",
            "17524321616779334076563551363039953424972428231987869798917057647174772182008",
            "1"
        ],
        [
            "9527045980815012807591971068163832511923055490703891181742476683249663400812",
            "14919437593091433436135478965229793383175377442971270426065882879972890130681",
            "1"
        ],
        [
            "3639234697306878654428746187161679523244737811867565309168091655504927526777",
            "11621081796882613972177228753660940901724246325363725488764147861203394608548",
            "1"
        ],
        [
            "15920831021378221155240937686904389906888962767568859307620388047895324408072",
            "20436997174641548986398492705818251523734696653333260143721187595574662853297",
            "1"
        ]
    ]
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

export const submitSemaphorePost = (post: Post) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const state = getState();
    const {
        semaphore,
    } = state.web3;
    const identityCommitment = semaphore.commitment;
    const identityNullifier = semaphore.identityNullifier;
    const identityTrapdoor = semaphore.identityTrapdoor;
    const identityPathElements = semaphore.identityPath?.path_elements;
    const identityPathIndex = semaphore.identityPath?.path_index;
    const privKey = semaphore.keypair?.privKey;
    const pubKey = semaphore.keypair?.pubKey;

    if (!identityCommitment || !identityPathElements || !identityPathIndex || !privKey || !pubKey || !identityTrapdoor || !identityNullifier) {
        return null;
    }

    const {
        messageId,
        hash,
        ...json
    } = post.toJSON();
    const externalNullifier = OrdinarySemaphore.genExternalNullifier('POST');
    const signalHash = await OrdinarySemaphore.genSignalHash(hash);
    const nullifiersHash = OrdinarySemaphore.genNullifierHash(externalNullifier, identityNullifier as any, 15);

    const wasmFilePath = `${config.indexerAPI}/dev/semaphore_wasm`;
    const finalZkeyPath = `${config.indexerAPI}/dev/semaphore_final_zkey`;

    const identity: Identity = {
        keypair: semaphore.keypair as any,
        identityTrapdoor: semaphore.identityTrapdoor,
        identityNullifier: semaphore.identityNullifier,
    };
    const {
        proof,
        publicSignals,
    } = await OrdinarySemaphore.genProofFromBuiltTree(
        identity,
        hash,
        {
            indices:   identityPathIndex,
            pathElements: identityPathElements,
        },
        externalNullifier,
        wasmFilePath,
        finalZkeyPath,
    );

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

        dispatch(setDraft(EditorState.createEmpty(), post.payload.reference || ''));
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

    const { drafts, web3 } = getState();
    const draft = drafts.map[reference];
    const {
        ensName,
        semaphore,
    } = web3;

    if (!draft) return;

    const currentContent = draft.editorState.getCurrentContent();
    const markdown = draftToMarkdown(convertToRaw(currentContent), markdownConvertOptions);

    const post = new Post({
        type: MessageType.Post,
        subtype: reference ? PostMessageSubType.Reply : PostMessageSubType.Default,
        creator: semaphore.keypair.privKey ? '' : ensName,
        payload: {
            content: markdown,
            reference: reference,
        },
    });

    if (semaphore.keypair.privKey) {
        await dispatch(submitSemaphorePost(post));
        console.log({ post });
        return post;
    }

    // @ts-ignore
    if (!gun.user().is) return;

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

    const { web3 } = getState();
    const {
        ensName,
    } = web3;

    // @ts-ignore
    if (!gun.user().is) return;

    const post = new Post({
        type: MessageType.Post,
        subtype: PostMessageSubType.Repost,
        creator: ensName,
        payload: {
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

export const submitModeration = (reference = '', subtype: ModerationMessageSubType) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    dispatch({
        type: ActionTypes.SET_SUBMITTING,
        payload: true,
    });

    const { web3 } = getState();
    const {
        ensName,
    } = web3;

    // @ts-ignore
    if (!gun.user().is) return;

    const moderation = new Moderation({
        type: MessageType.Moderation,
        subtype: subtype,
        creator: ensName,
        payload: {
            reference: reference,
        },
    });

    const {
        messageId,
        hash,
        ...json
    } = await moderation.toJSON();

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
    } catch (e) {
        dispatch({
            type: ActionTypes.SET_SUBMITTING,
            payload: false,
        });
        throw e;
    }
}


export const submitConnection = (name: string, subtype: ConnectionMessageSubType) => async (dispatch: Dispatch, getState: () => AppRootState) => {
    const { web3 } = getState();
    const {
        ensName,
    } = web3;
    const gunUser = gun.user();

    // @ts-ignore
    if (!gunUser.is) return;

    dispatch({
        type: ActionTypes.SET_SUBMITTING,
        payload: true,
    });

    const connection = new Connection({
        type: MessageType.Connection,
        subtype: subtype,
        creator: ensName,
        payload: {
            name: name,
        },
    });

    const {
        messageId,
        hash,
        ...json
    } = await connection.toJSON();

    try {
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

    const { web3 } = getState();
    const {
        ensName,
    } = web3;

    const post = new Profile({
        type: MessageType.Profile,
        subtype: subtype,
        creator: ensName,
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

export const useSubmitting = (): boolean => {
    return useSelector((state: AppRootState) => {
        return state.drafts.submitting;
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
        case ActionTypes.SET_SUBMITTING:
            return {
                ...state,
                submitting: action.payload,
            };
        default:
            return state;
    }
}