import {Strategy, ZkIdentity} from "@zk-kit/identity";
import {checkPath} from "./interrep";
import {genExternalNullifier, MerkleProof, RLN, RLNFullProof, Semaphore, SemaphoreFullProof} from "@zk-kit/protocols";
import config from "./config";
import {Dispatch} from "redux";
import {AppRootState} from "../store/configureAppStore";
import {ZKPR} from "../ducks/zkpr";
import {getEpoch} from "./zkchat";
import {sha256} from "./crypto";
import {findProof} from "./merkle";
import {Identity} from "@semaphore-protocol/identity";
import {SerializedIdentity} from "@zk-kit/identity/src/types/index";

export const generateRLNProof = (
    signalString: string,
) => async (
    dispatch: Dispatch,
    getState: () => AppRootState,
): Promise<RLNFullProof|null> => {
    const state = getState();
    const { selected } = state.worker;
    const { zkpr } = state.zkpr;

    switch (selected?.type) {
        case "interrep":
            return generateRLNProofFromLocalIdentity(
                signalString,
                new ZkIdentity(Strategy.SERIALIZED, selected.serializedIdentity),
                `interrep_${selected.provider.toLowerCase()}_${selected.name}`,
            );
        case "taz":
            const zkIdentity = new Identity(selected.serializedIdentity);
            const identityTrapdoor = zkIdentity.getTrapdoor();
            const identityNullifier = zkIdentity.getNullifier();
            const data: SerializedIdentity = {
                identityTrapdoor: identityTrapdoor.toString(16),
                identityNullifier: identityNullifier.toString(16),
                secret: [identityNullifier, identityTrapdoor].map((item) => item.toString(16))
            };
            return generateRLNProofFromLocalIdentity(
                signalString,
                new ZkIdentity(Strategy.SERIALIZED, JSON.stringify(data)),
                `semaphore_taz_members`,
            );
        // case "zkpr_interrep":
        //     return generateSemaphoreProofFromZKPR(
        //         externalNullifierString,
        //         signalString,
        //         selected.identityCommitment,
        //         zkpr!,
        //         `interrep_${selected.provider.toLowerCase()}_${selected.name}`,
        //     )
        default:
            return null;
    }
}

export const generateSemaphoreProofFromZKPR = async (
    externalNullifierString: string,
    signalString: string,
    identityCommitment: string,
    zkpr: ZKPR,
): Promise<SemaphoreFullProof|null> => {
    const data: any = await checkPath(identityCommitment);
    const identityPathElements = data.path.path_elements;
    const identityPathIndex = data.path.path_index;
    const root = data.path.root;

    if (!identityCommitment || !identityPathElements || !identityPathIndex) {
        return null;
    }

    const externalNullifier = genExternalNullifier(externalNullifierString);
    const wasmFilePath = `${config.indexerAPI}/circuits/semaphore/wasm`;
    const finalZkeyPath = `${config.indexerAPI}/circuits/semaphore/zkey`;

    const {fullProof} = await zkpr.semaphoreProof(
        externalNullifier,
        signalString,
        wasmFilePath,
        finalZkeyPath,
        '',
        {
            root: root.toString(),
            leaf: identityCommitment,
            siblings: identityPathElements.map((d: BigInt) => d.toString()),
            pathIndices: identityPathIndex,
        }
    );

    return fullProof;
}

export const generateRLNProofFromLocalIdentity = async (
    signalString: string,
    zkIdentity: ZkIdentity,
    group: string,
): Promise<RLNFullProof & {epoch: string; x_share: string}|null> => {
    const identitySecretHash = zkIdentity.getSecretHash();
    const identityCommitment = zkIdentity.genIdentityCommitment().toString();
    const merkleProof: MerkleProof | null = await findProof(
        group,
        BigInt(identityCommitment).toString(16),
        'rln',
    );
    const identityPathElements = merkleProof!.siblings;
    const identityPathIndex = merkleProof!.pathIndices;
    const root = merkleProof!.root;

    if (!identityCommitment || !identityPathElements || !identityPathIndex) {
        return null;
    }

    const epoch = getEpoch();
    const externalNullifier = genExternalNullifier(epoch);
    const signal = signalString;
    const rlnIdentifier = await sha256('zkchat');
    const xShare = RLN.genSignalHash(signal);
    const witness = RLN.genWitness(
        identitySecretHash!,
        merkleProof!,
        externalNullifier,
        signal,
        BigInt('0x' + rlnIdentifier),
    );
    const fullProof = await RLN.genProof(
        witness,
        `${config.indexerAPI}/circuits/rln/wasm`,
        `${config.indexerAPI}/circuits/rln/zkey`,
    );

    return {
        ...fullProof,
        x_share: xShare.toString(),
        epoch,
    };
}