import { Strategy, ZkIdentity } from '@zk-kit/identity';
import { checkPath } from './interrep';
import {
  genExternalNullifier,
  MerkleProof,
  RLN,
  RLNFullProof,
  SemaphoreFullProof,
} from '@zk-kit/protocols';
import config from './config';
import { Dispatch } from 'redux';
import { AppRootState } from '../store/configureAppStore';
import { ZKPR } from '@ducks/zkpr';
import { getEpoch } from './zkchat';
import { sha256 } from './crypto';
import { findProof } from './merkle';
import { safeJsonParse } from '~/misc';
import { Identity } from '../serviceWorkers/identity';
import {
  decrypt,
  deriveSharedSecret,
  generateECDHKeyPairFromZKIdentity,
  generateECDHWithP256,
} from 'zkitter-js';

export const generateRLNProof =
  (signalString: string) =>
  async (dispatch: Dispatch, getState: () => AppRootState): Promise<RLNFullProof | null> => {
    const state = getState();
    const { selected } = state.worker;

    switch (selected?.type) {
      case 'interrep':
        return generateRLNProofFromLocalIdentity(
          signalString,
          deserializeZKIdentity(selected.serializedIdentity)!,
          `interrep_${selected.provider.toLowerCase()}_${selected.name}`
        );
      case 'taz':
        return generateRLNProofFromLocalIdentity(
          signalString,
          deserializeZKIdentity(selected.serializedIdentity)!,
          `semaphore_taz_members`
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
  };

export const generateSemaphoreProofFromZKPR = async (
  externalNullifierString: string,
  signalString: string,
  identityCommitment: string,
  zkpr: ZKPR
): Promise<SemaphoreFullProof | null> => {
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

  const { fullProof } = await zkpr.semaphoreProof(
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
};

export const generateRLNProofFromLocalIdentity = async (
  signalString: string,
  zkIdentity: ZkIdentity,
  group: string
): Promise<(RLNFullProof & { epoch: string; x_share: string }) | null> => {
  const identitySecretHash = zkIdentity.getSecretHash();
  const identityCommitment = zkIdentity.genIdentityCommitment().toString();
  const merkleProof: MerkleProof | null = await findProof(
    group,
    BigInt(identityCommitment).toString(16),
    'rln'
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
    BigInt('0x' + rlnIdentifier)
  );
  const fullProof = await RLN.genProof(
    witness,
    `${config.indexerAPI}/circuits/rln/wasm`,
    `${config.indexerAPI}/circuits/rln/zkey`
  );

  return {
    ...fullProof,
    x_share: xShare.toString(),
    epoch,
  };
};

export const deserializeZKIdentity = (serializedIdentity: string): ZkIdentity | null => {
  const parsed = safeJsonParse(serializedIdentity);

  let zkIdentity = null;

  if (parsed?.identityNullifier && parsed?.identityTrapdoor && parsed?.secret.length) {
    zkIdentity = new ZkIdentity(Strategy.SERIALIZED, serializedIdentity);
  } else if (parsed?.length === 2) {
    zkIdentity = new ZkIdentity(
      Strategy.SERIALIZED,
      JSON.stringify({
        identityNullifier: parsed[1],
        identityTrapdoor: parsed[0],
        secret: [parsed[1], parsed[0]],
      })
    );
  }

  return zkIdentity;
};

export const getECDHFromLocalIdentity = async (
  identity: Identity,
  seed?: number | string
): Promise<{ pub: string; priv: string } | null> => {
  if (identity.type === 'gun') {
    return generateECDHWithP256(identity.privateKey, 0);
  } else if (identity.type === 'interrep' || identity.type === 'taz') {
    return generateECDHKeyPairFromZKIdentity(
      deserializeZKIdentity(identity.serializedIdentity)!,
      seed
    );
  }

  return null;
};
