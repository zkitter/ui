import config from './config';
import { Identity } from '../serviceWorkers/identity';
import { findProof } from './merkle';
import { MerkleProof } from '@zk-kit/protocols';

type PathData = {
  path: {
    path_elements: BigInt[];
    path_index: number[];
    root: BigInt;
  };
  provider: string;
  name: string;
};

export const checkPath = async (commitment: string): Promise<PathData | null> => {
  const resp = await fetch(`${config.indexerAPI}/interrep/${commitment}`);
  const {
    payload: { data, name, provider },
    error,
  } = await resp.json();

  let path = null;
  let groupName = '';

  if (error) {
    return null;
  }

  if (!error && data) {
    path = {
      path_elements: data.siblings.map((el: string) => BigInt(el)),
      path_index: data.pathIndices as number[],
      root: BigInt(data.root),
    };
    groupName = name as string;

    return {
      path,
      provider: provider as string,
      name: groupName,
    };
  }

  return null;
};

export const watchPath = async (
  group: string,
  commitment: string
): Promise<(MerkleProof & { group: string }) | null> => {
  let count = 0;
  return new Promise(async (resolve, reject) => {
    _watchTx();

    async function _watchTx() {
      count++;
      const data = await findProof(group, commitment);

      if (data) {
        resolve(data);
        return;
      }

      if (count > 12) {
        reject(new Error('timed out'));
      }

      setTimeout(_watchTx, 5000);
    }
  });
};

export const getGroupName = (
  identity:
    | Identity
    | {
        type: 'interrep';
        provider?: string;
        name?: string;
      }
): string => {
  if (identity.type !== 'interrep') return '';

  const provider = identity?.provider?.toLowerCase();
  const name = identity?.name?.toLowerCase();

  if (provider === 'twitter') {
    if (name === 'unrated') return 'Twitter (< 500 followers)';
    if (name === 'bronze') return 'Twitter (500+ followers)';
    if (name === 'silver') return 'Twitter (2000+ followers)';
    if (name === 'gold') return 'Twitter (7000+ followers)';
  }

  return 'Anonymous';
};
