import config from "./config";
import {MerkleProof} from "@zk-kit/protocols";

type PathData = {
    path_elements: string[] | string[][];
    path_index: number[];
    root: string;
};

export type ValidGroups = 'zksocial_all'
    | 'interep_twitter_unrated';

export const findProof = async (
    group: string,
    idCommitment: string,
): Promise<MerkleProof & {group: string}|null> => {
    const resp = await fetch(`${config.indexerAPI}/v1/proofs/${idCommitment}?group=${group}`);
    const { payload, error } = await resp.json();
    const { data } = payload;

    let path = null;

    if (error) {
        throw new Error(payload);
    }

    if (!error && data) {
        path = {
            siblings: data.siblings,
            pathIndices: data.pathIndices,
            root: data.root,
            leaf: data.leaf,
            group: data.group,
        };

        return path;
    }

    return null;
}