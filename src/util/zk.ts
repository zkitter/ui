import {Strategy, ZkIdentity} from "@zk-kit/identity";
import {checkPath} from "./interrep";
import {genExternalNullifier, Semaphore, SemaphoreFullProof} from "@zk-kit/protocols";
import config from "./config";
import {Dispatch} from "redux";
import {AppRootState} from "../store/configureAppStore";
import {ZKPR} from "../ducks/zkpr";

export const generateSemaphoreProof = (
    externalNullifierString: string,
    signalString: string,
) => async (
    dispatch: Dispatch,
    getState: () => AppRootState,
): Promise<SemaphoreFullProof|null> => {
    const state = getState();
    const { selected } = state.worker;
    const { zkpr } = state.zkpr;

    switch (selected?.type) {
        case "interrep":
            return generateSemaphoreProofFromLocalIdentity(
                externalNullifierString,
                signalString,
                new ZkIdentity(Strategy.SERIALIZED, selected.serializedIdentity),
            );
        case "zkpr_interrep":
            return generateSemaphoreProofFromZKPR(
                externalNullifierString,
                signalString,
                selected.identityCommitment,
                zkpr!,
            )
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

export const generateSemaphoreProofFromLocalIdentity = async (
    externalNullifierString: string,
    signalString: string,
    zkIdentity: ZkIdentity,
): Promise<SemaphoreFullProof|null> => {
    const identityTrapdoor = zkIdentity.getTrapdoor();
    const identityNullifier = zkIdentity.getNullifier();
    const identityCommitment = zkIdentity.genIdentityCommitment().toString();
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
        signalString,
    );

    return await Semaphore.genProof(witness, wasmFilePath, finalZkeyPath);
}