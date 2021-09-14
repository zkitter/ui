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

OrdinarySemaphore.setHasher('pedersen');

import {ThunkDispatch} from "redux-thunk";
import {markdownConvertOptions} from "../components/DraftEditor";
import config from "../util/config";
import {Identity} from "libsemaphore";
const { draftToMarkdown } = require('markdown-draft-js');
import * as ethers from 'ethers';

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
            "20412496579646178329446013823999258916085887050491756371307082589164650138752",
            "7490503588618946439564083891102536641287454355288954107745120736148681444599"
        ],
        [
            "21559668815928244968535998782799536254717057376653502467655544876293377688150",
            "3381291478891953405004837657146032830083575686024616186088238796675321709572"
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
            "9843736127145598099894218802193289274093651528012488840525896216610359139682",
            "586482290948698738712256090214616195176375343729849050782826389645790623979",
            "1"
        ],
        [
            "21078569720629036240351296805917814866947733291947868262426706670723830097218",
            "11229976929675799186447871534777502842421622344015388325803686253080447491562",
            "1"
        ],
        [
            "9331932411602086491383168763551307344616722484317473065160380292918473239516",
            "15365662357847939791810443801729811303271582910398347423168856947240893295024",
            "1"
        ],
        [
            "21181636888435751541764935955986104221355746219573535844630857300815849737868",
            "13495240006213316510867663858551083971559481869616574484784317298799733409415",
            "1"
        ],
        [
            "10036734662323163080291823944027088741299589156665680008801002827049144125322",
            "21260894604371407565142626827656329480096441281122169732539192575787261886258",
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

    const ZERO_VALUE = BigInt(ethers.utils.solidityKeccak256(['bytes'], [ethers.utils.toUtf8Bytes('Semaphore')]));

    console.log(ZERO_VALUE, hash);
    const {
        fullProof: {
            proof,
            publicSignals,
        },
    } = await OrdinarySemaphore.genProofFromIdentityCommitments(
        identity,
        externalNullifier,
        hash,
        wasmFilePath,
        finalZkeyPath,
        [identityCommitment, BigInt('13712199883159678741221077246526113294424161973362965000646512447088528244915')],
        15,
        ZERO_VALUE,
        2,
    );

    try {
        // @ts-ignore
        const semaphorePost: any = {
            ...json,
            proof: JSON.stringify(proof),
            publicSignals: JSON.stringify(publicSignals),
        };

        const pubSignals = [
            publicSignals[0],
            nullifiersHash,
            signalHash,
            externalNullifier,
        ];

        console.log('from fullProof.publicSignals', publicSignals)
        console.log('constructed pubsignals', pubSignals)
        console.log('result from pubsignals', await OrdinarySemaphore.verifyProof(
            vKey, {
                proof: proof,
                publicSignals: pubSignals,
            }));
        console.log('result from fullProof.publicSignals', await OrdinarySemaphore.verifyProof(
            vKey, {
                proof: proof,
                publicSignals: publicSignals,
            }));

        // @ts-ignore
        // await gun.get('message')
        //     .get(messageId)
        //     // @ts-ignore
        //     .put(semaphorePost);

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
        return dispatch(submitSemaphorePost(post));
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