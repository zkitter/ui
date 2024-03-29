import config from './config';
import { MerkleProof } from '@zk-kit/protocols';

export const findProof = async (
  group: string,
  idCommitment: string,
  proofType?: 'semaphore' | 'rln'
): Promise<(MerkleProof & { group: string }) | null> => {
  const proofTypeParam = proofType ? `&proofType=${proofType}` : '';
  const resp = await fetch(
    `${config.indexerAPI}/v1/proofs/${idCommitment}?group=${group}${proofTypeParam}`
  );
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
};
